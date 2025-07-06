require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
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





// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//     }
// });
// async function run() {
//     try {
//         // Connect the client to the server	(optional starting in v4.7)
//         await client.connect();
//         // Send a ping to confirm a successful connection
//         await client.db("admin").command({ ping: 1 });
//         console.log("Pinged your deployment. You successfully connected to MongoDB!");
//     } finally {
//         // Ensures that the client will close when you finish/error
//         await client.close();
//     }
// }
// run().catch(console.dir);




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
        console.error("Error trying to read db: ", err)
        return [];
    } finally {
        await client.close();
    }
}


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
    } finally {
        await client.close();
    }
})


app.get("/api/items", async (req, res) => {
    const items = await readItems();
    res.json(items);
});

app.listen(PORT, () => {
    console.log(`Server listening on localhost:${PORT}`);
});