const { MongoClient, ObjectId } = require('mongodb');
const { sendWinnerEmail } = require('./email-utils');

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

async function sendWinnerEmailNotification(winnerEmail, itemTitle, winningBid, winnerUsername) {
    try {
        console.log(`Sending winner email to: ${winnerEmail}`);
        const result = await sendWinnerEmail(winnerEmail, itemTitle, winningBid, winnerUsername);
        console.log("Winner email sent successfully:", result.messageId);
        return { success: true, result };
    } catch (error) {
        console.error("Error sending winner email:", error);
        throw error;
    }
}

async function cancelAuction(itemId, uid, endTime) {
    const dbName = "Auction_CSIS3380";
    const itemObjectId = new ObjectId(itemId);
    const session = client.startSession();

    try {
        await client.connect();
        const db = client.db(dbName);
        const itemsCollection = db.collection("Items");
        const bidsCollection = db.collection("Bids");

        await session.withTransaction(async () => {
            const item = await itemsCollection.findOne({ _id: itemObjectId }, { session });
            if (!item || item.uid !== uid) {
                throw new Error("Item not found or not owned by user");
            }
            if (item.isClosed) {
                throw new Error("Auction for this item is already closed");
            }

            await bidsCollection.updateMany(
                { itemId: itemObjectId },
                { $set: { isActive: false } },
                { session }
            );

            await itemsCollection.updateOne(
                { _id: itemObjectId },
                {
                    $set: {
                        isClosed: true,
                        endAt: new Date(endTime),
                        winningBid: null,
                        winnerUid: null
                    }
                },
                { session }
            );
        });

        return { message: "Auction cancelled successfully" };
    } finally {
        await session.endSession();
    }
}

async function endAuction(itemId, uid, endTime) {
    const dbName = "Auction_CSIS3380";
    const itemObjectId = new ObjectId(itemId);
    const session = client.startSession();

    try {
        await client.connect();
        const db = client.db(dbName);
        const itemsCollection = db.collection("Items");
        const bidsCollection = db.collection("Bids");

        let winnerUid = null;
        let highestBid = null;
        let item = null;

        await session.withTransaction(async () => {
            item = await itemsCollection.findOne({ _id: itemObjectId }, { session });
            if (!item || item.uid !== uid) {
                throw new Error("Item not found or not owned by user");
            }
            if (item.isClosed) {
                throw new Error("Auction for this item is already closed");
            }

            highestBid = item.currentBid || item.startingBid;
            const winningBid = await bidsCollection.findOne({
                itemId: itemObjectId,
                bidAmount: highestBid
            }, { session });

            if (winningBid) {
                winnerUid = winningBid.userId;
            }

            await bidsCollection.updateMany(
                { itemId: itemObjectId },
                { $set: { isActive: false } },
                { session }
            );

            await itemsCollection.updateOne(
                { _id: itemObjectId },
                {
                    $set: {
                        isClosed: true,
                        endAt: new Date(endTime),
                        winningBid: highestBid,
                        winnerUid: winnerUid
                    }
                },
                { session }
            );
        });

        // Notify winner
        if (winnerUid && highestBid) {
            try {
                const winnerInfo = await readUserInfo(winnerUid);
                if (winnerInfo && winnerInfo.email) {
                    await sendWinnerEmailNotification(
                        winnerInfo.email,
                        item.title,
                        highestBid,
                        winnerInfo.displayName || winnerInfo.email
                    );
                    console.log("Winner email sent to:", winnerInfo.email);
                }
            } catch (error) {
                console.error("Error sending winner email:", error);
                // Continue even if email fails
            }
        }

        return {
            message: "Auction ended successfully",
            winnerUid,
            highestBid
        };
    } finally {
        await session.endSession();
    }
}

module.exports = async function handler(req, res) {
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

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    const { itemId, uid, endTime } = req.body;

    if (!itemId || !uid || !endTime) {
        return res.status(400).json({ error: "Please provide itemId, uid, and endTime" });
    }

    if (!ObjectId.isValid(itemId)) {
        return res.status(400).json({ error: "Invalid item ID format" });
    }

    try {
        if (pathname.includes('/cancel-auction')) {
            const result = await cancelAuction(itemId, uid, endTime);
            return res.status(200).json(result);
        }

        if (pathname.includes('/end-auction')) {
            const result = await endAuction(itemId, uid, endTime);
            return res.status(200).json(result);
        }

        // Default to cancel auction
        const result = await cancelAuction(itemId, uid, endTime);
        return res.status(200).json(result);

    } catch (err) {
        console.error("Error in auction management:", err);
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
};
