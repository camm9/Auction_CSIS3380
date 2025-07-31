const { useState, useEffect } = React;

const DisplayNameModal = ({ onSubmit }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Please enter a display name');
            return;
        }
        try {
            // This will create a display name for the user in mongo and not in FB
            const uid = window.auth.currentUser.uid;
            await fetch("http://localhost:5001/displayname", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid, displayName: name })
            });
            onSubmit(name);

        } catch (err) {
            setError("Failed to save displayname: " + err.message);
        }


    };

    return (
        <div className="item-modal-overlay">
            <div className="item-modal">
                <h2>Choose A Display Name</h2>
                <input
                    type="text"
                    placeholder="Enter display name"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setError('');
                    }}
                />
                <button onClick={handleSave}>Save</button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>
        </div>
    );
};


const SignIn = ({ onSuccess, onRegister }) => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState('signin'); //are they registering or logging in
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        try {
            setError('');
            let userCredential;
            if (mode === 'signin') {
                userCredential = await window.signInUser(email, password);
            } else {
                userCredential = await window.registerUser(email, password);
                if (onRegister) onRegister();
            }

            await fetch("http://localhost:5001/sign-in", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            onSuccess(); //close modal
        } catch (err) {
            setError(err.message);
        }
    };
    return (
        <div className="item-modal-overlay">
            <div className="item-modal">
                <h2>{mode === 'signin' ? "Sign In" : "Register A New Account"}</h2>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                /><br />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                /><br />
                Would you like to sign in or register?
                <button onClick={handleSubmit}>
                    {mode === 'signin' ? "Sign In" : "Register"}
                </button>
                <p className="sign-in-mode" onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}>
                    {mode === 'signin' ? "Register" : "Sign In"}
                </p>
                {error && <p style={{ color: 'red' }}>{error}</p>}

            </div>
        </div>
    );
};

// const ItemModal = ({ item, onClose, user, onBidSuccess }) => {
//     const [bidAmount, setBidAmount] = useState('');
//     const [error, setError] = useState('');
//     const [success, setSuccess] = useState('');

//     // Helper function to extract numeric values from MongoDB objects
//     const getNumericValue = (value) => {
//         if (typeof value === 'number') {
//             return value;
//         }
//         if (typeof value === 'object' && value !== null) {
//             if (value.$numberInt) return parseInt(value.$numberInt);
//             if (value.$numberDouble) return parseFloat(value.$numberDouble);
//             if (value.$numberDecimal) return parseFloat(value.$numberDecimal);
//         }
//         return 0;
//     };

//     const currentBid = getNumericValue(item.currentBid);
//     const startingBid = getNumericValue(item.startingBid);
//     const displayBid = currentBid || startingBid;
//     const minBidAmount = (currentBid || startingBid) + 1;

//     //Ensure there is input
//     const handlePlaceBid = async () => {
//         if (!bidAmount || isNaN(bidAmount)) {
//             setError('Please enter a valid bid amount');
//             return;
//         }

//         try {
//             const response = await fetch('http://localhost:5001/place-bid', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     itemId: item._id,
//                     uid: user.uid,
//                     bidAmount: parseFloat(bidAmount)
//                 })
//             });

//             const data = await response.json();

//             if (response.ok) {
//                 setSuccess('Bid placed successfully!');
//                 setError('');
//                 setBidAmount('');

//                 if (onBidSuccess) {
//                     onBidSuccess();
//                 }

//             } else {
//                 setError(data.message || 'Failed to place bid');
//             }
//         } catch (err) {
//             setError('Error placing bid: ' + err.message);
//         }
//     };

//     return (
//         <div className="item-modal-overlay">
//             <div className="item-modal">
//                 <h2>{item.title}</h2>
//                 <p>Current Bid: ${displayBid}</p>
//                 <label>
//                     Your Bid:
//                     <input
//                         type="number"
//                         value={bidAmount}
//                         onChange={(e) => setBidAmount(e.target.value)}
//                         min={minBidAmount}
//                     />
//                 </label>
//                 <div>
//                     <button onClick={handlePlaceBid}>Place Bid</button>
//                     <button onClick={onClose}>Close</button>
//                 </div>
//                 {error && <p style={{ color: 'red' }}>{error}</p>}
//                 {success && <p style={{ color: 'green' }}>{success}</p>}
//             </div>
//         </div>
//     );
// };

const getNumericValue = (value) => {
    if (typeof value === 'number') return value;
    if (value && typeof value === 'object') {
        if ('$numberInt' in value) return parseInt(value.$numberInt);
        if ('$numberDouble' in value) return parseFloat(value.$numberDouble);
        if ('$numberDecimal' in value) return parseFloat(value.$numberDecimal);
    }
    return 0;
};

const ItemModal = ({ item, onClose, user, onBidSuccess }) => {
    const [bidAmount, setBidAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeBidsCount, setActiveBidsCount] = useState(0);

    // Fetch user's active bids count when modal opens
    useEffect(() => {
        const fetchActiveBids = async () => {
            try {
                const response = await fetch(`http://localhost:5001/user/active-bids?uid=${user.uid}`);
                const data = await response.json();
                if (response.ok) {
                    setActiveBidsCount(data.count);
                }
            } catch (err) {
                console.error("Error fetching active bids:", err);
            }
        };

        if (user.uid) {
            fetchActiveBids();
        }
    }, [user]);


    const currentBid = getNumericValue(item.currentBid);
    const startingBid = getNumericValue(item.startingBid);
    const displayBid = currentBid || startingBid;
    const minBidAmount = (currentBid || startingBid) + 1;

    const handlePlaceBid = async () => {
        if (!bidAmount || isNaN(bidAmount)) {
            setError('Please enter a valid bid amount');
            return;
        }

        try {
            const response = await fetch('http://localhost:5001/place-bid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: item._id,
                    uid: user.uid,
                    bidAmount: parseFloat(bidAmount)
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Bid placed successfully!');
                setError('');
                setBidAmount('');
                setActiveBidsCount(prev => prev + 1); // Increment active bid count

                if (onBidSuccess) {
                    onBidSuccess();
                }
            } else {
                setError(data.message || 'Failed to place bid');
            }
        } catch (err) {
            setError('Error placing bid: ' + err.message);
        }
    };
    return (
        <div className="item-modal-overlay">
            <div className="item-modal">
                <h2>{item.title}</h2>
                <p>Current Bid: ${displayBid}</p>
                {activeBidsCount >= 5 && (
                    <p style={{ color: 'red' }}>
                        You have reached your limit of 5 active bids
                    </p>
                )}
                <label>
                    Your Bid:
                    <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={minBidAmount}
                        disabled={activeBidsCount >= 5} // Disable input if limit reached
                    />
                </label>
                <div>
                    <button
                        onClick={handlePlaceBid}
                        disabled={activeBidsCount >= 5} // Disable button if limit reached
                    >
                        Place Bid
                    </button>
                    <button onClick={onClose}>Close</button>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {success && <p style={{ color: 'green' }}>{success}</p>}
            </div>
        </div>
    );
};

const ItemCard = ({ item, onPlaceBid, user }) => {
    const isUsersItem = user && item.uid === user.uid;

    // Helper function to extract numeric values from MongoDB objects
    const getNumericValue = (value) => {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'object' && value !== null) {
            if (value.$numberInt) return parseInt(value.$numberInt);
            if (value.$numberDouble) return parseFloat(value.$numberDouble);
            if (value.$numberDecimal) return parseFloat(value.$numberDecimal);
        }
        return 0;
    };

    const currentBid = getNumericValue(item.currentBid);
    const startingBid = getNumericValue(item.startingBid);
    const displayBid = currentBid || startingBid;

    return (
        <div>{!item.isClosed && (
            <div className="item-card">
                <div key={item._id}>
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                    <img src={item.imageUrl} alt={item.title} width="150" />
                    <p>Current Bid: ${displayBid}</p>
                    {!isUsersItem && (<button onClick={() => onPlaceBid(item)}>Place Bid</button>)}
                </div>
            </div>)}
        </div>
    );
};

const App = () => {
    const [items, setItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [showDisplayNameModal, setShowDisplayNameModal] = useState(false)
    const [userItems, setUserItems] = useState([]);
    const [otherItems, setOtherItems] = useState([]);
    const [showUserListings, setShowUserListings] = useState(true);

    // Get items from mongo
    useEffect(() => {
        fetch("http://localhost:5001/api/items")
            .then(res => res.json())
            .then(data => setItems(data))
            .catch(err => console.error("Error fetching items:", err));
    }, []);

    // check user status in Firebase
    useEffect(() => {
        const auth = window.auth;
        const unsubscribe = auth.onAuthStateChanged(user => {
            setIsSignedIn(!!user);
            setUser(user);
        })
        return () => unsubscribe();
    }, []);

    // Sort Items by uid, uid matches current user then they cannot bid
    useEffect(() => {
        if (!user || items.length === 0) return;
        const userItems = items.filter(item => item.uid === user.uid);
        const otherItems = items.filter(item => item.uid !== user.uid);
        setOtherItems(otherItems);
        setUserItems(userItems);
    }, [user, items]);

    const refreshItems = async () => {
        const res = await fetch("http://localhost:5001/api/items");
        const data = await res.json();
        setItems(data);

        if (selectedItems) {
            const updatedItem = data.find(i => i._id === selectedItems._id);
            setSelectedItems(updatedItem);
        }
    };

    return (
        <div>
            <h1>Auction</h1>
            <a href="useraccount.html"><button> Go to User Account</button></a>
            <button onClick={() => window.signOutUser()}>Sign Out</button>
            {!isSignedIn && <SignIn onSuccess={() => setIsSignedIn(true)} onRegister={() => setShowDisplayNameModal(true)} />}
            {showDisplayNameModal && (
                <DisplayNameModal
                    onSubmit={(name) => {
                        console.log("Display name saved:", name);
                        setShowDisplayNameModal(false); // now it closes
                    }}
                />
            )}
            <button onClick={() => setShowUserListings(!showUserListings)}>
                {showUserListings ? "Hide Your Listings" : "Show Your Listings"}
            </button>
            {showUserListings && (
                <div>
                    <h2> Your Active Listed Items</h2>
                    <div className="item-list">
                        {userItems.map(item => <ItemCard
                            key={item._id}
                            item={item}
                            onPlaceBid={setSelectedItems}
                            user={user} />
                        )}
                    </div>
                </div>)}
            <h2> Browse Items</h2>
            <div className="item-list">
                {otherItems.map(item => <ItemCard
                    key={item._id}
                    item={item}
                    onPlaceBid={setSelectedItems}
                    user={user} />
                )}
                {selectedItems && <ItemModal item={selectedItems} onClose={() => setSelectedItems(null)
                } user={user} onBidSuccess={refreshItems} />}
            </div>
        </div>
    );
};

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(<App />);