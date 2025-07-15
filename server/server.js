require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const cors = require("cors");
const app = express();
const admin = require("firebase-admin");
const serviceAccount = require("./auctioncsis3380-firebase-adminsdk.json");


app.use(cors());
app.use(express.json());


const PORT = process.env.PORT || 3001;
const uri = process.env.MONGO_URL
const client = new MongoClient(uri);

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