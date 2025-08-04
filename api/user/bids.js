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

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const uid = req.query.uid;
    console.log("Received UID for user bids:", uid);

    if (!uid) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        await client.connect();
        const dbName = "Auction_CSIS3380";
        const bidsCollection = client.db(dbName).collection("Bids");

        const bids = await bidsCollection.find({ userId: uid }).toArray();
        res.status(200).json(bids);
    } catch (err) {
        console.error("Error fetching user bids:", err);
        res.status(500).json({ error: "Server error fetching bids" });
    }
};
