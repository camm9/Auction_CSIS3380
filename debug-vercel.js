// Debug script for Vercel deployment
// Add this to your browser console to test API endpoints

console.log("🔧 Auction App Debug Helper");

// Test API endpoints
const testAPI = async () => {
    const endpoints = [
        '/api/items',
        '/api/user/info/?uid=test123',
        '/api/user/active-bids?uid=test123'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint}...`);
            const response = await fetch(endpoint);
            console.log(`✅ ${endpoint}: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const data = await response.text();
                console.log(`📄 Response preview:`, data.substring(0, 100) + '...');
            }
        } catch (error) {
            console.error(`❌ ${endpoint}: ${error.message}`);
        }
    }
};

// Test Firebase Auth
const testFirebase = () => {
    console.log("🔥 Firebase Auth Status:");
    console.log("Auth object:", window.auth);
    console.log("Current user:", window.auth?.currentUser);

    if (window.auth) {
        window.auth.onAuthStateChanged((user) => {
            console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
        });
    }
};

// Run tests
console.log("Running API tests...");
testAPI();

console.log("Testing Firebase...");
testFirebase();

console.log("Debug complete! Check the console output above.");
