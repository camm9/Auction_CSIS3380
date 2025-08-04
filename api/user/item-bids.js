const { MongoClient, ObjectId } = require('mongodb');

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
};
