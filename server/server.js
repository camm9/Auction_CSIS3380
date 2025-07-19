require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const cors = require("cors");
const app = express();
const admin = require("firebase-admin");
const serviceAccount = require("./auctioncsis3380-firebase-adminsdk.json");
const { createTransport } = require("nodemailer");
const { sendMail } = require("./nodemailer.js");



app.use(cors());
app.use(express.json());


const PORT = process.env.PORT || 3001;
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

app.post('/create-new-listing', async (req, res) => {
    const { uid, title, description, imageUrl, createdBy, startingBid, endAt } = req.body;
    const createdAt = Date.now();
    const isClosed = false;
    const winningBid = null;

    const newItemListing = {
        uid,
        title,
        description,
        imageUrl,
        sellerDisplayName: createdBy,
        startingBid,
        endAt,
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

        await itemsCollection.insertOne(newItemListing);

        console.log("Mongo Record ", newItemListing)
        res.status(200).send("New Listing Created")

    } catch (err) {
        console.error("Error trying to create new listing: ", err)
        res.status(500).send("Server error during creation of new listing.");
    }
})

app.post("/displayname", async (req, res) => {
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


app.post('/sign-in', async (req, res) => {
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

app.post('/end-auction', async (req, res) => {
    const { itemId, uid, endTime } = req.body;
    console.log("Received itemId:", itemId, "uid:", uid, "endTime:", endTime);
    // Validate input
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
        const bidsCollection = db.collection("Bids")
        // Check if the item exists and belongs to the user
        const item = await itemsCollection.findOne({ _id: itemObjectId });
        console.log("Item found in db:", item);
        if (!item || item.uid !== uid) {
            return res.status(404).json({ error: "Item not found" });
        }
        if (item.isClosed) {
            console.log("Auction for this item is already closed");
            return res.status(400).json({ error: "Auction for this item is already closed" });
        }
        // Find the highest bid for the item, if no bids exist, use the starting bid
        const highestBid = item.currentBid || item.startingBid;

        // Find the winner of the auction
        let winnerUid = null;
        const winningBid = await bidsCollection.findOne({ itemId: itemObjectId, bidAmount: highestBid });
        if (!winningBid) {
            console.log("No winning bid found for item:", itemId);
        } else {
            winnerUid = winningBid.userId;
        }

        // console.log("Winner UID: ", winnerUid, "Highest Bid: ", highestBid);

        // Notify the winner via Nodemailer
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

        // Update the item to mark it as closed
        await itemsCollection.updateOne(
            { _id: itemObjectId },
            {
                $set: { isClosed: true, endAt: new Date(endTime), winningBid: highestBid, winnerUid: winnerUid }
            }
        )

    } catch (err) {
        console.error("Error ending auction:", err);
        return res.status(500).json({ error: "Internal Server Error while trying to end auction" });
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



app.post('/place-bid', async (req, res) => {
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
            const item = await itemsCollection.findOne({ _id: itemObjectId }, { session });

            if (!item) {
                throw new Error("Item not found");
            }
            if (item.isClosed) {
                throw new Error("Auction for this item is closed");
            }

            const currentBid = item.currentBid || item.startingBid;
            if (numericBidAmount <= currentBid) {
                throw new Error(`Bid must be higher than $${currentBid}`);
            }

            const newBid = {
                itemId: itemObjectId,
                userId: uid,
                bidAmount: numericBidAmount,
                bidTime: new Date(),
                itemTitle: item.title
            };

            const bidResult = await bidsCollection.insertOne(newBid, { session });

            const updateResult = await itemsCollection.updateOne(
                { _id: itemObjectId },
                {
                    $set: {
                        currentBid: numericBidAmount,
                        winningBid: bidResult.insertedId
                    }
                },
                { session }
            );

            result = {
                bidId: bidResult.insertedId,
                updated: updateResult.modifiedCount
            };
        });

        res.status(200).json({
            message: "Bid placed successfully",
            ...result
        });

    } catch (err) {
        console.error("Error placing bid:", err);
        res.status(500).json({ error: err.message || "Internal Server Error" });
    }
    //  finally {
    //     await session.endSession();
    //     await client.close();
    // }
});

app.get('/user/bids', async (req, res) => {
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
    // finally {
    //     await client.close();
    // }
})


app.get('/user/info/', async (req, res) => {
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

app.listen(PORT, () => {
    console.log(`Server listening on localhost:${PORT}`);
});