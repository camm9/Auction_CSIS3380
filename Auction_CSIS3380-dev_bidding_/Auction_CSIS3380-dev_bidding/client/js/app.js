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

const ItemModal = ({ item, onClose }) => {
    return (
        <div className="item-modal-overlay">
            <div className="item-modal">
                <h2>{item.title}</h2>
                <p>Current Bid: $</p>
                <label>
                    Your Bid:
                    <input type="number" />
                </label>
                <div>
                    <button>Place Bid</button>
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

const ItemCard = ({ item, onPlaceBid, user }) => {
    const isUsersItem = user && item.uid === user.uid; //create a boolean for whether user owns item or not

    return (
        <div className="item-card">
            <div key={item._id}>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <p>Seller: {item.createdBy}</p>
                <img src={item.imageUrl} alt={item.title} width="150" />
                <p>Current Bid: $</p>
                {!isUsersItem && (<button onClick={() => onPlaceBid(item)}>Place Bid</button>)}
                {isUsersItem && <p>View your listing's details</p>}
            </div>
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

    return (
        <div>
            <h1>Auction</h1>
            <a href="useraccount.html">Go to User Account</a>
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
            <h2> Your Listed Items</h2>
            <div className="item-list">
                {userItems.map(item => <ItemCard
                    key={item._id}
                    item={item}
                    onPlaceBid={setSelectedItems}
                    user={user} />
                )}
            </div>
            <h2> Browse Items</h2>
            <div className="item-list">
                {otherItems.map(item => <ItemCard
                    key={item._id}
                    item={item}
                    onPlaceBid={setSelectedItems}
                    user={user} />
                )}
                {selectedItems && <ItemModal item={selectedItems} onClose={() => setSelectedItems(null)} />}
            </div>
        </div>
    );
};

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(<App />);