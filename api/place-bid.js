const { MongoClient, ObjectId } = require('mongodb');
const { sendOutbidEmail } = require('./email-utils');

const client = new MongoClient(process.env.MONGO_URL);

async function readUserInfo(uid) {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const collectionName = "Users";
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    try {
        const results = await collection.findOne({ uid })
        return results;
    } catch (err) {
        console.error("Error trying to read user info from db: ", err)
        return null;
    }
}

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    console.log('place-bid handler called:', req.method, req.url);
    console.log('Request body:', req.body);

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // First, let's just test if we can receive the request properly
    if (!req.body) {
        return res.status(400).json({ error: 'No request body received' });
    }

    const { itemId, uid, bidAmount } = req.body;
    console.log('Parsed params:', { itemId, uid, bidAmount });

    if (!itemId || !uid || bidAmount === undefined) {
        return res.status(400).json({
            error: "Please input a bid amount",
            received: { itemId, uid, bidAmount }
        });
    }

    const numericBidAmount = Number(bidAmount);
    if (isNaN(numericBidAmount) || numericBidAmount <= 0) {
        return res.status(400).json({ error: "Invalid bid amount" });
    }

    // Test MongoDB connection first
    if (!process.env.MONGO_URL) {
        return res.status(500).json({ error: "MongoDB URL not configured" });
    }

    if (!ObjectId.isValid(itemId)) {
        return res.status(400).json({ error: "Invalid item ID format" });
    }

    console.log('All validations passed, attempting database connection...');

    const dbName = "Auction_CSIS3380";
    const itemObjectId = new ObjectId(itemId);
    let session;
    let emailInfo = null; // Store email info for sending after transaction

    try {
        await client.connect();
        console.log('MongoDB connected successfully');

        const db = client.db(dbName);
        const itemsCollection = db.collection("Items");
        const bidsCollection = db.collection("Bids");

        session = client.startSession();

        let result;
        await session.withTransaction(async () => {
            console.log('Starting transaction...');

            const activeBidsCount = await bidsCollection.countDocuments({
                userId: uid,
                isActive: true
            }, { session });

            console.log('Active bids count:', activeBidsCount);

            if (activeBidsCount >= 5) {
                throw new Error("You can't have more than 5 active bids at once");
            }

            const item = await itemsCollection.findOne({ _id: itemObjectId }, { session });
            console.log('Found item:', item ? 'Yes' : 'No');

            if (!item) throw new Error("Item not found");
            if (item.isClosed) throw new Error("Auction for this item is closed");

            const currentBid = item.currentBid || item.startingBid;
            if (numericBidAmount <= currentBid) {
                throw new Error(`Bid must be higher than $${currentBid}`);
            }

            // Find previous highest active bid (excluding current user) for outbid notification
            const previousHighestBid = await bidsCollection.findOne(
                { itemId: itemObjectId, isActive: true, userId: { $ne: uid } },
                { sort: { bidAmount: -1 }, session }
            );

            if (previousHighestBid) {
                const previousUser = await readUserInfo(previousHighestBid.userId);
                if (previousUser?.email) {
                    emailInfo = {
                        to: previousUser.email,
                        title: item.title,
                        newBid: numericBidAmount,
                    };
                    console.log('Outbid email will be sent to:', previousUser.email);
                }
            }

            const newBid = {
                itemId: itemObjectId,
                userId: uid,
                bidAmount: numericBidAmount,
                bidTime: new Date(),
                isActive: true,
                itemTitle: item.title
            };
            const bidResult = await bidsCollection.insertOne(newBid, { session });

            await itemsCollection.updateOne(
                { _id: itemObjectId },
                {
                    $set: {
                        currentBid: numericBidAmount,
                        winningBid: bidResult.insertedId
                    }
                },
                { session }
            );

            await bidsCollection.updateMany(
                {
                    itemId: itemObjectId,
                    isActive: true,
                    userId: { $ne: uid }
                },
                {
                    $set: { isActive: false }
                },
                { session }
            );

            result = {
                bidId: bidResult.insertedId,
                updated: 1
            };

            console.log('Transaction completed successfully');
        });

        // Send outbid notification email after transaction commits
        if (emailInfo) {
            try {
                console.log('Sending outbid email...');
                await sendOutbidEmail(emailInfo.to, emailInfo.title, emailInfo.newBid);
                console.log('Outbid email sent successfully to:', emailInfo.to);
            } catch (emailError) {
                console.error("Failed to send outbid email:", emailError);
                // Continue without failing the request
            }
        }

        res.status(200).json({
            message: "Bid placed successfully",
            ...result
        });
    } catch (err) {
        console.error("Error placing bid:", err);
        res.status(400).json({
            error: err.message || "Internal Server Error",
            details: err.toString()
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
}
