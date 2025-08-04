const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URL);

async function readItems() {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const collectionName = "Items";
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    try {
        const cursor = await collection.find();
        const results = await cursor.toArray();
        return results;
    } catch (err) {
        console.error("Error trying to read items from db: ", err);
        return [];
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

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid } = req.query;

    if (!uid) {
        return res.status(400).json({ error: 'UID is required' });
    }

    try {
        const items = await readItems();
        const userItems = items.filter(item => item.uid === uid);
        console.log("User's items:", userItems.length, "items found");
        res.status(200).json(userItems);
    } catch (error) {
        console.error("Error fetching user items:", error);
        res.status(500).json({ error: "Failed to fetch user items" });
    }
};
