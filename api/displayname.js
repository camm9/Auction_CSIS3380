const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: process.env.FIREBASE_AUTH_URI,
            token_uri: process.env.FIREBASE_TOKEN_URI,
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
            client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
        })
    });
}

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

    const { uid, displayName } = req.body;

    if (!uid || !displayName) {
        return res.status(400).json({ error: 'UID and displayName are required' });
    }

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
            return res.status(401).json({ error: "User not found in Firebase" });
        }

        await usersCollection.updateOne({ uid }, { $set: { displayName: displayName } });

        console.log("Mongo Record ", uid, "updated with displayname ", displayName);
        res.status(200).json({ message: "Display name updated" });
    } catch (err) {
        console.error("Error trying to update displayname: ", err);
        res.status(500).json({ error: "Server error during displayname update." });
    }
};
