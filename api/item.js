const { MongoClient, ObjectId } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URL);

async function readItems() {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const collectionName = "Items";
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    try {
        const cursor = await collection.find()
        const results = await cursor.toArray();
        return results;
    } catch (err) {
        console.error("Error trying to read items from db: ", err)
        return [];
    }
}

async function getItemBidHistory(itemId) {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const bidsCollection = client.db(dbName).collection("Bids");
    const usersCollection = client.db(dbName).collection("Users");
    const itemObjectId = new ObjectId(itemId);

    try {
        const bids = await bidsCollection.find({ itemId: itemObjectId })
            .sort({ bidAmount: -1, bidTime: 1 })
            .toArray();

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

        return enrichedBids;
    } catch (err) {
        console.error("Error fetching item bid history:", err);
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

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    try {
        if (pathname.includes('/items') && !pathname.includes('/bid-history')) {
            const items = await readItems();
            return res.status(200).json(items);
        }

        if (pathname.includes('/bid-history')) {
            const itemId = url.searchParams.get('itemId');
            if (!itemId) {
                return res.status(400).json({ error: "Item ID is required" });
            }
            if (!ObjectId.isValid(itemId)) {
                return res.status(400).json({ error: "Invalid item ID format" });
            }
            const bidHistory = await getItemBidHistory(itemId);
            return res.status(200).json(bidHistory);
        }

        // Default to returning all items
        const items = await readItems();
        return res.status(200).json(items);

    } catch (err) {
        console.error("Error in item API:", err);
        res.status(500).json({ error: "Server error fetching items" });
    }
};
