const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URL);

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

    const { uid, title, description, imageUrl, createdBy, startingBid, endAt, itemCategory } = req.body;
    const createdAt = Date.now();
    const isClosed = false;
    const winningBid = null;

    if (!uid || !title || !description || !imageUrl || !createdBy || !startingBid || !endAt || !itemCategory) {
        return res.status(400).json({
            error: "Please provide all required fields: uid, title, description, imageUrl, createdBy, startingBid, endAt, itemCategory"
        });
    }

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
    };

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
            console.log("Mongo Record ", newItemListing);
            res.status(200).json({
                message: "New Listing Created",
                listing: newItemListing
            });
        }
    } catch (err) {
        console.error("Error trying to create new listing: ", err);
        res.status(500).json({
            error: "Server error during creation of new listing."
        });
    }
};
