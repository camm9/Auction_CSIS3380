const { MongoClient, ObjectId } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URL);

async function readUserInfo(uid) {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const collectionName = "Users";
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    try {
        const results = await collection.findOne({ uid })
        return results;
    } catch (err) {
        console.error("Error trying to read user info from db: ", err)
        return null;
    }
}

async function getUserItems(uid) {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const collectionName = "Items";
    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    try {
        const cursor = await collection.find({ uid });
        const results = await cursor.toArray();
        return results;
    } catch (err) {
        console.error("Error trying to read user items from db: ", err)
        return [];
    }
}

async function getUserBids(uid) {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const bidsCollection = client.db(dbName).collection("Bids");

    try {
        const bids = await bidsCollection.find({ userId: uid }).toArray();
        return bids;
    } catch (err) {
        console.error("Error fetching user bids:", err);
        return [];
    }
}

async function getActiveBidsCount(uid) {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const bidsCollection = client.db(dbName).collection("Bids");

    try {
        const count = await bidsCollection.countDocuments({
            userId: uid,
            isActive: true
        });
        return count;
    } catch (err) {
        console.error("Error fetching active bids count:", err);
        return 0;
    }
}

async function getUserItemBids(itemId, uid) {
    await client.connect();
    const dbName = "Auction_CSIS3380";
    const bidsCollection = client.db(dbName).collection("Bids");
    const itemObjectId = new ObjectId(itemId);

    try {
        const userBids = await bidsCollection.find({
            itemId: itemObjectId,
            userId: uid
        })
            .sort({ bidTime: -1 })
            .toArray();
        return userBids;
    } catch (err) {
        console.error("Error fetching user's bids for item:", err);
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

    // Parse the URL to determine which endpoint was called
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    try {
        // Handle different user endpoints based on URL path
        if (pathname.includes('/user/info')) {
            const uid = url.searchParams.get('uid');
            if (!uid) {
                return res.status(400).json({ error: 'User ID is required' });
            }
            const userInfo = await readUserInfo(uid);
            return res.status(200).json(userInfo);
        }

        if (pathname.includes('/user/items') || pathname.includes('/user_items')) {
            const uid = url.searchParams.get('uid');
            if (!uid) {
                return res.status(400).json({ error: 'User ID is required' });
            }
            const userItems = await getUserItems(uid);
            return res.status(200).json(userItems);
        }

        if (pathname.includes('/user/bids')) {
            const uid = url.searchParams.get('uid');
            if (!uid) {
                return res.status(400).json({ error: 'User ID is required' });
            }
            const userBids = await getUserBids(uid);
            return res.status(200).json(userBids);
        }

        if (pathname.includes('/user/active-bids')) {
            const uid = url.searchParams.get('uid');
            if (!uid) {
                return res.status(400).json({ error: 'User ID is required' });
            }
            const count = await getActiveBidsCount(uid);
            return res.status(200).json({ count });
        }

        if (pathname.includes('/user/item-bids')) {
            const itemId = url.searchParams.get('itemId');
            const uid = url.searchParams.get('uid');
            if (!itemId || !uid) {
                return res.status(400).json({ error: "Item ID and User ID are required" });
            }
            if (!ObjectId.isValid(itemId)) {
                return res.status(400).json({ error: "Invalid item ID format" });
            }
            const userBids = await getUserItemBids(itemId, uid);
            return res.status(200).json(userBids);
        }

        // Default fallback - treat as user info request
        const uid = url.searchParams.get('uid');
        if (!uid) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const userInfo = await readUserInfo(uid);
        return res.status(200).json(userInfo);

    } catch (err) {
        console.error("Error in user API:", err);
        res.status(500).json({ error: "Server error" });
    }
};
