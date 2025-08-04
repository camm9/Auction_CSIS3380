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
};
