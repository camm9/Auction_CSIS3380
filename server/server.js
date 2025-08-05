require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const cors = require("cors");
const app = express();
const admin = require("firebase-admin");
const serviceAccount = require("./auctioncsis3380-firebase-adminsdk.json");
const { createTransport } = require("nodemailer");
const { sendMail, sendOutbidEmail } = require("./nodemailer.js");
const path = require('path');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));


const PORT = process.env.PORT || 5001;
const uri = process.env.MONGO_URL
const client = new MongoClient(uri);

// Initialize Nodemailer transporter
const transporter = createTransport({
    service: "gmail",
    auth: {
        type: "login",
        user: process.env.Google_user,
        pass: process.env.Google_App_Password,
    },
});

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function readItems() {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const collectionName = "Items";

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    // Read database

    try {
        const cursor = await collection.find()
        const results = await cursor.toArray();
        // console.log(results);
        return results;

    } catch (err) {
        console.error("Error trying to read items from db: ", err)
        return [];
    }
}

async function readUserInfo(uid) {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const collectionName = "Users";

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    // Read database

    try {
        const results = await collection.findOne({ uid })
        // console.log(results);
        return results;

    } catch (err) {
        console.error("Error trying to read user info from db: ", err)
        return null;
    }
}

app.post('/api/create-new-listing', async (req, res) => {
    const { uid, title, description, imageUrl, createdBy, startingBid, endAt, itemCategory } = req.body;
    const createdAt = Date.now();
    const isClosed = false;
    const winningBid = null;

    if (!uid || !title || !description || !imageUrl || !createdBy || !startingBid || !endAt || !itemCategory) {
        return res.status(400).json({ error: "Please provide all required fields: uid, title, description, imageUrl, createdBy, startingBid, endAt" });
    };

    const newItemListing = {
        uid,
        title,
        description,
        imageUrl,
        sellerDisplayName: createdBy,
        startingBid,
        endAt,
        itemCategory,
        createdAt,
        isClosed,
        winningBid
    }

    try {
        await client.connect();
        const dbName = "Auction_CSIS3380";
        const collectionName = "Items";
        const database = client.db(dbName);
        const itemsCollection = database.collection(collectionName);

        const activeListingsCount = await itemsCollection.countDocuments({ uid, isClosed: false });

        if (activeListingsCount >= 30) {
            return res.status(400).json({ error: "You can only have 30 active listings at a time." });
        } else {
            await itemsCollection.insertOne(newItemListing);
            console.log("Mongo Record ", newItemListing)
            res.status(200).json({
                message: "New Listing Created",
                listing: newItemListing
            });
        }

    } catch (err) {
        console.error("Error trying to create new listing: ", err)
        res.status(500).json({
            error: "Server error during creation of new listing."
        });
    }
})

app.post("/api/displayname", async (req, res) => {
    const { uid, displayName } = req.body;
    try {
        await client.connect();
        const dbName = "Auction_CSIS3380";
        const collectionName = "Users";
        const database = client.db(dbName);
        const usersCollection = database.collection(collectionName);

        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUser(uid);
        } catch (err) {
            return res.status(401).send("User not found in fb")
        }
        await usersCollection.updateOne({ uid }, { $set: { displayName: displayName } }); //update display name for uid

        console.log("Mongo Record ", uid, "updated with displayname ", displayName)
        res.status(200).send("Display name updated")

    } catch (err) {
        console.error("Error trying to update displayname: ", err)
        res.status(500).send("Server error during displayname update.");
    }
})


app.post('/api/sign-in', async (req, res) => {
    const { email } = req.body;

    try {
        await client.connect();
        const dbName = "Auction_CSIS3380";
        const collectionName = "Users";
        const database = client.db(dbName);
        const usersCollection = database.collection(collectionName);

        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUserByEmail(email);
        } catch (err) {
            return res.status(401).send("User not found in fb")
        }

        let userRecord_mongo = await usersCollection.findOne({ email });
        // console.log("userRecord_mongo before assignment:", userRecord_mongo);

        if (!userRecord_mongo) {
            const newUser = {
                email: firebaseUser.email,
                uid: firebaseUser.uid,
                createdAt: new Date(),
            };
            await usersCollection.insertOne(newUser);
            userRecord_mongo = newUser;
            // console.log("newUser:", newUser);

        }
        res.status(200).json({ message: "Login Successful!", user: userRecord_mongo });
    } catch (err) {
        console.error("Error trying to sync users in mongo and fb: ", err)
        res.status(500).send("Server error during user sync.");
    }
})

app.post('/api/cancel-auction', async (req, res) => {
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

        await session.withTransaction(async () => {
            // Check if the item exists and belongs to the user
            const item = await itemsCollection.findOne({ _id: itemObjectId }, { session });
            console.log("Item found in db:", item);
            if (!item || item.uid !== uid) {
                throw new Error("Item not found or not owned by user");
            }
            if (item.isClosed) {
                console.log("Auction for this item is already closed");
                throw new Error("Auction for this item is already closed");
            }

            // Mark all bids for this item as inactive
            await bidsCollection.updateMany(
                { itemId: itemObjectId },
                { $set: { isActive: false } },
                { session }
            );

            // Update the item to mark it as closed
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

            res.status(200).json({
                message: "Auction cancelled successfully",
            });
        });

    } catch (err) {
        console.error("Error ending auction:", err);
        return res.status(500).json({ error: err.message || "Internal Server Error while trying to end auction" });
    } finally {
        await session.endSession();
    }
});

app.post('/api/end-auction', async (req, res) => {
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

        await session.withTransaction(async () => {
            // Check if the item exists and belongs to the user
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
            const highestBid = item.currentBid || item.startingBid;

            // Find the winner of the auction
            let winnerUid = null;
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

            // Update the item to mark it as closed
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

            // Notify the winner if there is one
            if (winnerUid && highestBid) {
                const winnerEmail = await readUserInfo(winnerUid).then(user => user.email);
                const winnerUsername = await readUserInfo(winnerUid).then(user => user.displayName || user.email);
                console.log("Winner Email: ", winnerEmail, "Winner Username: ", winnerUsername);
                try {
                    await sendWinnerEmail(winnerEmail, item.title, highestBid, winnerUsername);
                    console.log("Winner email sent to: ", winnerEmail);
                } catch (error) {
                    console.error("Error sending winner email:", error);
                }
            }

            res.status(200).json({
                message: "Auction ended successfully",
                winnerUid,
                highestBid
            });
        });

    } catch (err) {
        console.error("Error ending auction:", err);
        return res.status(500).json({ error: err.message || "Internal Server Error while trying to end auction" });
    } finally {
        await session.endSession();
    }
});

sendWinnerEmail = async (winnerEmail, itemTitle, winningBid, winnerUsername) => {
    const to = winnerEmail
    const subject = `Congratulations! You won the auction for ${itemTitle}`;
    const text = ` Dear ${winnerUsername},\n\nCongratulations! You have won the auction for the ${itemTitle}
    with a bid of $${winningBid}. Please visit the auction and confirm payment.\n\n`

    try {
        const info = await sendMail(to, subject, text);
        console.log("Email sent successfully:", info);
        return { success: true, info };

    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
}

app.post('/api/send-winner-email', async (req, res) => {
    console.log("Received request to send winner email");
    const { winnerEmail, itemTitle, winningBid } = req.body;

    if (!winnerEmail || !itemTitle || winningBid === undefined) {
        return res.status(400).json({ error: "Please provide winnerEmail, itemTitle, and winningBid" });
    }

    try {
        await sendWinnerEmail(winnerEmail, itemTitle, winningBid);
        res.status(200).json({ message: "Email sent successfully" });

    } catch (error) {
        res.status(500).json({ error: "Failed to send email" });
    }

})
app.post('/api/place-bid', async (req, res) => {
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

    let emailInfo = null; // Store email info for sending after transaction

    try {
        await client.connect();
        const db = client.db(dbName);
        const itemsCollection = db.collection("Items");
        const bidsCollection = db.collection("Bids");

        let result;
        await session.withTransaction(async () => {
            // 1. Check if user has reached the active bid limit (5)
            const activeBidsCount = await bidsCollection.countDocuments({
                userId: uid,
                isActive: true
            }, { session });

            if (activeBidsCount >= 5) {
                throw new Error("You can't have more than 5 active bids at once");
            }

            // 2. Verify item exists and is open for bidding
            const item = await itemsCollection.findOne({ _id: itemObjectId }, { session });
            if (!item) throw new Error("Item not found");
            if (item.isClosed) throw new Error("Auction for this item is closed");

            // 3. Verify bid is higher than current bid
            const currentBid = item.currentBid || item.startingBid;
            if (numericBidAmount <= currentBid) {
                throw new Error(`Bid must be higher than $${currentBid}`);
            }

            // 4. Create new bid record
            const newBid = {
                itemId: itemObjectId,
                userId: uid,
                bidAmount: numericBidAmount,
                bidTime: new Date(),
                isActive: true,
                itemTitle: item.title
            };
            const bidResult = await bidsCollection.insertOne(newBid, { session });

            // Find previous highest active bid (excluding current user)
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
                }
            }

            // 5. Update item with new current bid and winning bid
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

            // 6. Mark older active bids on this item (from other users) as inactive
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

        // Send outbid notification email after transaction commits
        if (emailInfo) {
            try {
                await sendOutbidEmail(emailInfo.to, emailInfo.title, emailInfo.newBid);
            } catch (emailError) {
                console.error("Failed to send outbid email:", emailError);
                // You can choose to continue without failing the request here
            }
        }

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
});


app.get('/api/user/active-bids', async (req, res) => {
    const uid = req.query.uid;
    console.log("Received UID for active bids count:", uid);
    try {
        await client.connect();
        const dbName = "Auction_CSIS3380";
        const bidsCollection = client.db(dbName).collection("Bids");

        const count = await bidsCollection.countDocuments({
            userId: uid,
            isActive: true
        });

        res.status(200).json({ count });
    } catch (err) {
        console.error("Error fetching active bids count:", err);
        res.status(500).send("Server error fetching active bids count");
    }
});

app.get('/api/user/bids', async (req, res) => {
    const uid = req.query.uid;
    console.log("Received UID:", uid);
    try {
        await client.connect();
        const dbName = "Auction_CSIS3380";
        const bidsCollection = client.db(dbName).collection("Bids");

        const bids = await bidsCollection.find({ userId: uid }).toArray();
        res.status(200).json(bids);
    } catch (err) {
        console.error("Error fetching user bids:", err);
        res.status(500).send("Server error fetching bids");
    }
});

app.get('/api/item/bid-history', async (req, res) => {
    const itemId = req.query.itemId;
    console.log("Received itemId for bid history:", itemId);

    if (!itemId) {
        return res.status(400).json({ error: "Item ID is required" });
    }

    if (!ObjectId.isValid(itemId)) {
        return res.status(400).json({ error: "Invalid item ID format" });
    }

    try {
        await client.connect();
        const dbName = "Auction_CSIS3380";
        const bidsCollection = client.db(dbName).collection("Bids");
        const usersCollection = client.db(dbName).collection("Users");

        const itemObjectId = new ObjectId(itemId);

        // Get all bids for this item, sorted by bid amount (highest first) and then by time
        const bids = await bidsCollection.find({ itemId: itemObjectId })
            .sort({ bidAmount: -1, bidTime: 1 })
            .toArray();

        // Get bids with user display names
        const enrichedBids = await Promise.all(bids.map(async (bid) => {
            try {
                const user = await usersCollection.findOne({ uid: bid.userId });
                return {
                    ...bid,
                    bidderDisplayName: user ? (user.displayName || user.email) : 'Unknown User'
                };
            } catch (error) {
                console.error("Error fetching user info for bid:", bid._id, error);
                return {
                    ...bid,
                    bidderDisplayName: 'Unknown User'
                };
            }
        }));

        res.status(200).json(enrichedBids);
    } catch (err) {
        console.error("Error fetching item bid history:", err);
        res.status(500).json({ error: "Server error fetching bid history" });
    }
});

app.get('/api/user/item-bids', async (req, res) => {
    const { itemId, uid } = req.query;
    console.log("Received itemId and uid for user's item bids:", itemId, uid);

    if (!itemId || !uid) {
        return res.status(400).json({ error: "Item ID and User ID are required" });
    }

    if (!ObjectId.isValid(itemId)) {
        return res.status(400).json({ error: "Invalid item ID format" });
    }

    try {
        await client.connect();
        const dbName = "Auction_CSIS3380";
        const bidsCollection = client.db(dbName).collection("Bids");

        const itemObjectId = new ObjectId(itemId);

        // Get all bids by this user for this specific item, sorted by bid time (most recent first)
        const userBids = await bidsCollection.find({
            itemId: itemObjectId,
            userId: uid
        })
            .sort({ bidTime: -1 })
            .toArray();

        res.status(200).json(userBids);
    } catch (err) {
        console.error("Error fetching user's bids for item:", err);
        res.status(500).json({ error: "Server error fetching user's item bids" });
    }
});


app.get('/api/user/info', async (req, res) => {
    const userInfo = await readUserInfo(req.query.uid);
    res.json(userInfo);
})

app.get("/api/items", async (req, res) => {
    const items = await readItems();
    res.json(items);
});

app.get("/api/user_items", async (req, res) => {
    const userId = req.query.uid;
    const items = await readItems();
    const userItems = items.filter(item => item.uid === userId);
    console.log("User's items:", userItems);
    res.status(200).json(userItems);
});


//Insert many items into the database
// async function insertDocuments() {

//     try {
//         await client.connect();
//         const dbName = "Auction_CSIS3380";
//         const collectionName = "Items";
//         const database = client.db(dbName);
//         const itemsCollection = database.collection(collectionName);

//         const documents = [
//             { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur28", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur29", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur8", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur9", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur10", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur11", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur12", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur13", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur14", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur15", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur16", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur17", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur18", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur19", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur20", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur21", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur22", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur23", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur24", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur25", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },
//             // { "uid": "tKYngHOWs4SQQzqrP2lQAXkRCUi1", "title": "Dinosaur26", "description": "T-Rex Skeleton", "imageUrl": "https://s.wsj.net/public/resources/images/B3-BQ117_dino_M_20180906144443.jpg", "sellerDisplayName": "test1", "startingBid": { "$numberInt": "20000" }, "endAt": "2025-07-16T19:20:00.000Z", "createdAt": { "$numberDouble": "1752603612988.0" }, "isClosed": false, "winningBid": null },

//         ];

//         const result = await itemsCollection.insertMany(documents);
//         console.log(`${result.insertedCount} documents inserted`);
//     } finally {
//         await client.close();
//     }
// }

// insertDocuments().catch(console.error);

app.use(express.static(path.join(__dirname, '../client')));

app.listen(PORT, () => {
    console.log(`Server listening on localhost:${PORT}`);
});