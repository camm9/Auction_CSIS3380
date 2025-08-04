const { MongoClient, ObjectId } = require('mongodb');
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: process.env.FIREBASE_AUTH_URI,
            token_uri: process.env.FIREBASE_TOKEN_URI,
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
            client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
        })
    });
}

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

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { itemId, uid, bidAmount } = req.body;

    if (!itemId || !uid || bidAmount === undefined) {
        return res.status(400).json({ error: "Please input a bid amount" });
    }

    const numericBidAmount = Number(bidAmount);
    if (isNaN(numericBidAmount) || numericBidAmount <= 0) {
        return res.status(400).json({ error: "Invalid bid amount" });
    }

    if (!ObjectId.isValid(itemId)) {
        return res.status(400).json({ error: "Invalid item ID format" });
    }

    const dbName = "Auction_CSIS3380";
    const itemObjectId = new ObjectId(itemId);
    const session = client.startSession();

    try {
        await client.connect();
        const db = client.db(dbName);
        const itemsCollection = db.collection("Items");
        const bidsCollection = db.collection("Bids");

        let result;
        await session.withTransaction(async () => {
            const activeBidsCount = await bidsCollection.countDocuments({
                userId: uid,
                isActive: true
            }, { session });

            if (activeBidsCount >= 5) {
                throw new Error("You can't have more than 5 active bids at once");
            }

            const item = await itemsCollection.findOne({ _id: itemObjectId }, { session });
            if (!item) throw new Error("Item not found");
            if (item.isClosed) throw new Error("Auction for this item is closed");

            const currentBid = item.currentBid || item.startingBid;
            if (numericBidAmount <= currentBid) {
                throw new Error(`Bid must be higher than $${currentBid}`);
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
        });

        res.status(200).json({
            message: "Bid placed successfully",
            ...result
        });
    } catch (err) {
        console.error("Error placing bid:", err);
        res.status(400).json({ error: err.message || "Internal Server Error" });
    } finally {
        await session.endSession();
    }
}
