const { useState, useEffect } = React;

const UserInfo = ({ userInfo, userListings, fetchUserListings, user }) => {
    if (!userInfo) return <p>Loading user info....</p>;

    return (
        <div>
            <h3> Account Details </h3>
            <p>Email: {userInfo.email}</p>
            <p>Display Name: {userInfo.displayName} </p>
            <UserListings userInfo={userInfo} userListings={userListings} fetchUserListings={fetchUserListings} user={user} />
            <UserBids userInfo={userInfo} />
        </div>
    );
}

const UserListings = ({ userInfo, userListings, fetchUserListings, user }) => {
    if (!userInfo) return <p>Loading user info....</p>;
    return (
        <div>
            <h3> {userInfo.displayName.toUpperCase()}'s Listings </h3>
            {userListings.map(item => (
                <UserItems
                    key={item._id}
                    item={item}
                    userInfo={userInfo}
                />
            ))}
            <CreateANewListing userInfo={userInfo}
                userListings={userListings}
                fetchUserListings={fetchUserListings}
                user={user} />
        </div>
    )
}


const UserItems = ({ userInfo, item }) => {
    const [showDisplayModal, setShowDisplayModal] = useState(false);
    if (!userInfo) return <p>Loading user listing info....</p>;
    // console.log("UserItems:", item);

    if (!item) return <p>No items found. Try listing an item.</p>;

    const endAuction = () => {
        // Function to end the auction and notify the winner

        let endTime = new Date(item.endAt);

        const requestData = {
            itemId: item._id,
            uid: userInfo.uid,
            endTime: endTime.toISOString()
        };

        console.log("Sending data to end auction:", requestData);

        fetch(`http://localhost:5001/end-auction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
            .then(async response => {
                const data = await response.json();

                if (response.ok) {
                    return data;
                } else {
                    // Server returned an error with JSON payload
                    console.log("Server error response:", data);
                    throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
                }
            })
            .then(data => {
                alert("Auction ended successfully and winner notified.");
                setShowDisplayModal(false);
                // Optionally, refresh user listings
                fetchUserListings(userInfo.uid);
            })
            .catch(err => {
                console.error("Error ending auction:", err);

                // Display the server's error message directly
                alert(err.message);
            });
    }

    return (
        <div className="user-item-list">
            <div className="item-card">
                <h4>{item.title}</h4>
                <img src={item.imageUrl} alt={item.title} width="150" />
                <p>{item.description}</p>
                <p>Current Bid: {item.currentBid ? `$${item.currentBid}` : "No bids yet."}</p>
                <p>Starting Bid: ${item.startingBid.toFixed(2)}</p>
                <p>Created At: {new Date(item.createdAt).toLocaleString()}</p>
                <p>Ends At: {new Date(item.endAt).toLocaleString()}</p>
                <button onClick={() => setShowDisplayModal(true)}>Close Auction</button>
                <button>View Bid History</button>
            </div>
            {showDisplayModal && (
                <div className="item-modal-overlay">
                    <div className="item-modal">
                        <h3>Close Auction</h3>
                        <p>Are you sure you want to close this auction?</p>
                        <button onClick={() => endAuction()}>End Auction & Notify Winner </button>
                        <p className="warning-message">Note: This will notify the highest bidder and close the auction.</p>
                        <button onClick={() => setShowDisplayModal(false)}>Cancel</button>
                    </div>
                </div>)}
        </div>

    )
}

const UserBids = ({ userInfo }) => {
    const [userBids, setUserBids] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!userInfo) return;

        const fetchBidHistory = async () => {
            try {
                // Get user bid history
                const answer = await fetch(`http://localhost:5001/user/bids?uid=${userInfo.uid}`);
                const data = await answer.json();

                if (answer.ok) {
                    setUserBids(data);
                } else {
                    setError(data.message || "There is no bid history");
                }

            } catch (err) {
                setError('Error finding user bid history');
            }
        };

        fetchBidHistory();
    }, [userInfo]);

    if (userBids === null) return <p>Loading user bid history...</p>

    return (
        <div>
            <h3>{userInfo.displayName ? userInfo.displayName.toUpperCase() : ''}'s Bid History</h3>
            {userBids.length === 0 ? (
                <p>You have not placed any bids yet</p>
            ) : (
                <div className="bid-list">
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Bid Amount</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userBids.map(bid => (
                                <tr key={bid._id}>
                                    <td>{bid.itemTitle}</td>
                                    <td>${bid.bidAmount.toFixed(2)}</td>
                                    <td>{new Date(bid.bidTime).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

const CreateANewListing = ({ userInfo, fetchUserListings, user }) => {
    const [error, setError] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [startingBid, setStartingBid] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        const uid = window.auth.currentUser.uid;
        if (!uid) {
            setError("User not logged in");
            return;
        }

        const endAt = new Date(`${date}T${time}`).toISOString();

        try {
            const uid = window.auth.currentUser.uid;
            await fetch("http://localhost:5001/create-new-listing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid,
                    title,
                    description,
                    imageUrl,
                    createdBy: userInfo.displayName || "Unknown",
                    startingBid: parseFloat(startingBid),
                    endAt
                })
            });

            alert("New listing created!")
            // Reset fields to create new listing
            setTitle('');
            setDescription('');
            setImageUrl('');
            setDate('');
            setTime('');
            setStartingBid('');

            // Refresh user listings
            if (fetchUserListings && user) {
                fetchUserListings(user.uid);
            }

        } catch (err) {
            setError("Failed to save new listing: " + err.message);
        }
    };
    return (
        <div>
            <h3> Create A New Listing </h3>
            <form onSubmit={handleSave}>
                <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <br />
                <input
                    type="text"
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />
                <br />
                <input
                    type="url"
                    placeholder="Image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    required
                />
                <br />
                <label>End Date: </label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                />
                <label>Time: </label>
                <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                />
                <br />
                <input
                    type="number"
                    placeholder="Starting Bid"
                    value={startingBid}
                    onChange={(e) => setStartingBid(e.target.value)}
                    min="1"
                    required
                />
                <br />
                <button type="submit">Create Listing</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    )
}


const App = () => {
    const [user, setUser] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [userListings, setUserListings] = useState([]);

    // get user object from FB
    useEffect(() => {
        const unsubscribe = window.auth.onAuthStateChanged((user) => {
            setUser(user);
        });
        return () => unsubscribe();
    }, []);

    //get user info from MongoDB
    useEffect(() => {
        if (!user) return;
        fetch("http://localhost:5001/user/info?" + new URLSearchParams({ uid: user.uid }))
            .then(res => res.json())
            .then(data => { setUserInfo(data) })
            .catch(err => console.error("Error fetching user info:", err));
    }, [user]);

    // get items from MongoDB and sort for user listings
    const fetchUserListings = (uid) => {
        fetch("http://localhost:5001/api/user_items?" + new URLSearchParams({ uid }))
            .then(res => res.json())
            .then(data => setUserListings(data))
            .catch(err => console.error("Error fetching items:", err));
    };

    useEffect(() => {
        if (!user) return;
        fetchUserListings(user.uid);
    }, [user]);

    return (
        <div>
            <h1> Your Account</h1>
            <a href="index.html">Go to Auction</a>
            <UserInfo userInfo={userInfo} userListings={userListings} fetchUserListings={fetchUserListings} user={user} />
        </div>
    )
}

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(<App />);