const { useState, useEffect } = React;

const SignIn = ({ onSuccess }) => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState('signin'); //are they registering or logging in
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        try {
            setError('');
            if (mode === 'signin') {
                await window.signInUser(email, password);
            } else {
                await window.registerUser(email, password);
            }
            onSuccess();
        } catch (err) {
            setError(err.message);
        }
    };
    return (
        <div className="item-modal-overlay">
            <div className="item-modal">
                <h2>{mode === 'signin' ? "Sign In" : "Register"}</h2>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                /><br />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                /><br />
                Would you like to sign in or register?
                <button onClick={handleSubmit}>
                    {mode === 'signin' ? "Sign In" : "Register"}
                </button>
                <button onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}>
                    {mode === 'signin' ? "Register" : "Sign In"}
                </button>
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

const ItemCard = ({ item, onPlaceBid }) => {
    return (
        <div className="item-card">
            <div key={item._id}>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <img src={item.imageUrl} alt={item.title} width="150" />
                <p>Current Bid: $</p>
                <button onClick={() => onPlaceBid(item)}>Place Bid</button>
            </div>
        </div>
    );
};

const App = () => {
    const [items, setItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState(null);
    const [isSignedIn, setIsSignedIn] = useState(false);

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
        })
        return () => unsubscribe();
    }, []);


    return (
        <div>
            <h1>Auction</h1>
            <button onClick={() => window.signOutUser()}>Sign Out</button>
            {!isSignedIn && <SignIn onSuccess={() => setIsSignedIn(true)} />}
            <div className="item-list">
                {items.map(item => <ItemCard
                    key={item._id}
                    item={item}
                    onPlaceBid={setSelectedItems} />
                )}
                {selectedItems && <ItemModal item={selectedItems} onClose={() => setSelectedItems(null)} />}
            </div>
        </div>
    );
};

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(<App />);