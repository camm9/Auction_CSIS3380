const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URL);

async function readUserInfo(uid) {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const collectionName = "Users";
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    try {
        const results = await collection.findOne({ uid });
        return results;
    } catch (err) {
        console.error("Error trying to read user info from db: ", err);
        return null;
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
        const userInfo = await readUserInfo(uid);
        res.status(200).json(userInfo);
    } catch (error) {
        console.error("Error fetching user info:", error);
        res.status(500).json({ error: "Failed to fetch user info" });
    }
};
