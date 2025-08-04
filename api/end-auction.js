const { MongoClient, ObjectId } = require('mongodb');

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

// Email functionality (basic implementation - you may want to enhance this)
async function sendWinnerEmail(winnerEmail, itemTitle, winningBid, winnerUsername) {
    // For now, just log the email details
    // In production, you'd use a service like SendGrid, Nodemailer, etc.
    console.log(`Would send winner email to: ${winnerEmail}`);
    console.log(`Subject: Congratulations! You won the auction for ${itemTitle}`);
    console.log(`Winner: ${winnerUsername}, Winning Bid: $${winningBid}`);

    // Return success for now
    return { success: true };
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

    const { itemId, uid, endTime } = req.body;
    console.log("Received itemId:", itemId, "uid:", uid, "endTime:", endTime);

    if (!itemId || !uid || !endTime) {
        return res.status(400).json({ error: "Please provide itemId, uid, and endTime" });
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

        let winnerUid = null;
        let highestBid = null;

        await session.withTransaction(async () => {
            // Verify item exists and belongs to the user
            const item = await itemsCollection.findOne({ _id: itemObjectId }, { session });
            console.log("Item found in db:", item);
            if (!item || item.uid !== uid) {
                throw new Error("Item not found or not owned by user");
            }
            if (item.isClosed) {
                console.log("Auction for this item is already closed");
                throw new Error("Auction for this item is already closed");
            }

            // Find the highest bid for the item
            highestBid = item.currentBid || item.startingBid;

            // Find the winner of the auction
            const winningBid = await bidsCollection.findOne({
                itemId: itemObjectId,
                bidAmount: highestBid
            }, { session });

            if (winningBid) {
                winnerUid = winningBid.userId;
            }

            // Mark all bids for this item as inactive
            await bidsCollection.updateMany(
                { itemId: itemObjectId },
                { $set: { isActive: false } },
                { session }
            );

            // Update the item to mark it as closed with winner
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

        // Notify the winner if there is one
        if (winnerUid && highestBid) {
            try {
                const winnerInfo = await readUserInfo(winnerUid);
                if (winnerInfo && winnerInfo.email) {
                    const winnerEmail = winnerInfo.email;
                    const winnerUsername = winnerInfo.displayName || winnerInfo.email;
                    console.log("Winner Email: ", winnerEmail, "Winner Username: ", winnerUsername);
                    await sendWinnerEmail(winnerEmail, "auction item", highestBid, winnerUsername);
                    console.log("Winner email sent to: ", winnerEmail);
                }
            } catch (error) {
                console.error("Error sending winner email:", error);
                // Continue even if email fails
            }
        }

        res.status(200).json({
            message: "Auction ended successfully",
            winnerUid,
            highestBid
        });

    } catch (err) {
        console.error("Error ending auction:", err);
        res.status(500).json({ error: err.message || "Internal Server Error while trying to end auction" });
    } finally {
        await session.endSession();
    }
};
