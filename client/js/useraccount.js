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
    // sort items so that active listings are at the top
    const sortedItems = userListings.sort((a, b) => {
        if (a.isClosed === b.isClosed) {
            return 0; // Keep original order if both have same status
        }
        return a.isClosed ? 1 : -1; // Closed items go to the end
    });
    return (
        <div>
            <h3> {userInfo.displayName.toUpperCase()}'s Listings </h3>
            <div className="item-list">
                {sortedItems.map(item => (
                    <UserItems
                        key={item._id}
                        item={item}
                        userInfo={userInfo}
                        fetchUserListings={fetchUserListings}
                    />
                ))}
            </div>

            <CreateANewListing userInfo={userInfo}
                userListings={userListings}
                fetchUserListings={fetchUserListings}
                user={user} />
        </div>
    )
}


const UserItems = ({ userInfo, item, fetchUserListings }) => {
    const [showDisplayModal, setShowDisplayModal] = useState(false);
    const [showBidHistoryModal, setShowBidHistoryModal] = useState(false);
    const [winnerDisplayName, setWinnerDisplayName] = useState(null);
    const [loadingWinner, setLoadingWinner] = useState(false);

    if (!userInfo) return <p>Loading user listing info....</p>;
    if (!item) return <p>No items found. Try listing an item.</p>;

    // Helper function to safely format numbers
    const formatPrice = (price) => {
        const numPrice = parseFloat(price);
        return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
    };

    // Fetch winner display name when item is closed and has a winner
    useEffect(() => {
        const fetchWinnerName = async () => {
            if (item.isClosed && !winnerDisplayName) {
                setLoadingWinner(true);
                try {
                    // Check if there's no winner first
                    if (item.winnerUid === null || item.winnerUid === undefined) {
                        setWinnerDisplayName("No Winner (Cancelled)");
                        return;
                    }

                    // Only make API call if there's actually a winnerUid
                    const response = await fetch(`/api/user/info/?uid=${item.winnerUid}`);
                    if (!response.ok) {
                        throw new Error(`Error fetching user info: ${response.statusText}`);
                    }
                    const data = await response.json();

                    if (data.displayName === null || data.displayName === undefined) {
                        setWinnerDisplayName("Unknown User");
                    } else {
                        setWinnerDisplayName(data.displayName);
                    }
                } catch (error) {
                    console.error("Error fetching winner display name:", error);
                    setWinnerDisplayName("Error loading name");
                } finally {
                    setLoadingWinner(false);
                }
            }
        };

        fetchWinnerName();
    }, [item.isClosed, item.winnerUid, winnerDisplayName]);

    const cancelAuction = () => {
        // Function to cancel the auction and declare no winner

        let actualEndTime = new Date(); // Current time when button is clicked

        const requestData = {
            itemId: item._id,
            uid: userInfo.uid,
            endTime: actualEndTime.toISOString()
        };

        fetch(`/api/cancel-auction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
            .then(async response => {
                const data = await response.json();

                if (response.ok) {
                    alert("Auction cancelled successfully.");
                    setShowDisplayModal(false);
                    // Refresh user listings
                    if (fetchUserListings) {
                        fetchUserListings(userInfo.uid);
                    }
                } else {
                    // Server returned an error with JSON payload
                    console.log("Server error response:", data);
                    throw new Error(data.error || data.message || `Server error status: ${response.status}`);
                }
            })
            .catch(err => {
                console.error("Error cancelling auction:", err);
                alert(err.message);
            });
    };

    const endAuction = () => {
        // Function to end the auction and notify the winner

        let actualEndTime = new Date(); // Current time when button is clicked

        const requestData = {
            itemId: item._id,
            uid: userInfo.uid,
            endTime: actualEndTime.toISOString()
        };

        console.log("Sending data to end auction:", requestData);

        fetch(`/api/end-auction`, {
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
                    throw new Error(data.error || data.message || `Server error status: ${response.status}`);
                }
            })
            .then(data => {
                alert("Auction ended successfully and winner notified.");
                setShowDisplayModal(false);
                // Refresh user listings
                if (fetchUserListings) {
                    fetchUserListings(userInfo.uid);
                }
            })
            .catch(err => {
                console.error("Error ending auction:", err);
                alert(err.message);
            });
    }

    return (
        <div>
            {/* Active Auction */}
            {!item.isClosed &&
                (<div className="item-card active-listing">
                    <h4>{item.title}</h4>
                    <img src={item.imageUrl} alt={item.title} width="150" />
                    <p>{item.description}</p>
                    <p>Current Bid: {item.currentBid ? `$${formatPrice(item.currentBid)}` : "No bids yet."}</p>
                    <p>Starting Bid: ${formatPrice(item.startingBid)}</p>
                    <p>Created At: {new Date(item.createdAt).toLocaleString()}</p>
                    <p>Ends At: {new Date(item.endAt).toLocaleString()}</p>
                    <button onClick={() => setShowDisplayModal(true)}>Close Auction</button>
                    <button onClick={() => setShowBidHistoryModal(true)}>View Bid History</button>
                </div>)}
            {/* Closed Auction Items */}
            {item.isClosed &&
                (<div className="item-card closed-listing">
                    <h4>{item.title}</h4>
                    <img src={item.imageUrl} alt={item.title} width="150" />
                    <p>{item.description}</p>
                    <p>Highest Bid: {item.currentBid ? `$${formatPrice(item.currentBid)}` : "No bids."}</p>
                    <p>Winner: {winnerDisplayName || "No winner"}</p>
                    <p>Created At: {new Date(item.createdAt).toLocaleString()}</p>
                    <p>Ended At: {new Date(item.endAt).toLocaleString()}</p>
                    <button onClick={() => setShowBidHistoryModal(true)}>View Bid History</button>
                </div>)}
            {
                showDisplayModal && (
                    <div className="item-modal-overlay">
                        <div className="item-modal">
                            <h3>Close Auction</h3>
                            <p>Are you sure you want to close this auction?</p>
                            <button className="cancel-auction" onClick={() => { cancelAuction() }}>Cancel Auction & Declare No Winner</button>
                            <button className="close-auction" onClick={() => endAuction()}>End Auction & Notify Winner </button>
                            <button onClick={() => setShowDisplayModal(false)}>Return</button>
                        </div>
                    </div>)
            }
            {
                showBidHistoryModal && (
                    <BidHistoryModal
                        itemId={item._id}
                        itemTitle={item.title}
                        onClose={() => setShowBidHistoryModal(false)}
                    />
                )
            }
        </div >
    )
}

const BidHistoryModal = ({ itemId, itemTitle, onClose }) => {
    const [bidHistory, setBidHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBidHistory = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/item/bid-history?itemId=${itemId}`);

                if (!response.ok) {
                    throw new Error(`Error fetching bid history: ${response.statusText}`);
                }

                const data = await response.json();
                setBidHistory(data);
            } catch (error) {
                console.error("Error fetching bid history:", error);
                setError("Failed to load bid history");
            } finally {
                setLoading(false);
            }
        };

        if (itemId) {
            fetchBidHistory();
        }
    }, [itemId]);

    const formatPrice = (price) => {
        const numPrice = parseFloat(price);
        return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
    };

    return (
        <div className="item-modal-overlay">
            <div className="item-modal bid-history-modal">
                <h3>Bid History for "{itemTitle}"</h3>

                {loading && <p>Loading bid history...</p>}

                {error && <p style={{ color: 'red' }}>{error}</p>}

                {!loading && !error && (
                    <div className="bid-history-content">
                        {bidHistory.length === 0 ? (
                            <p>No bids have been placed on this item yet.</p>
                        ) : (
                            <div className="bid-history-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Bidder</th>
                                            <th>Bid Amount</th>
                                            <th>Time</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bidHistory.map((bid, index) => (
                                            <tr key={bid._id} className={index === 0 ? 'highest-bid' : ''}>
                                                <td>{bid.bidderDisplayName}</td>
                                                <td>${formatPrice(bid.bidAmount)}</td>
                                                <td>{new Date(bid.bidTime).toLocaleString()}</td>
                                                <td>
                                                    {index === 0 ? (
                                                        <span className="winning-bid">Highest Bid</span>
                                                    ) : (
                                                        <span className="outbid">Outbid</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

const UserBids = ({ userInfo }) => {
    const [userBids, setUserBids] = useState([]);
    const [error, setError] = useState('');

    const formatPrice = (price) => {
        const numPrice = parseFloat(price);
        return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
    };

    useEffect(() => {
        if (!userInfo) return;

        const fetchBidHistory = async () => {
            try {
                // Get user bid history
                const answer = await fetch(`/api/user/bids?uid=${userInfo.uid}`);
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
    const [itemCategory, setItemCategory] = useState('');
    const [startingBid, setStartingBid] = useState('');


    const handleSave = async (e) => {
        e.preventDefault();
        const uid = window.auth.currentUser.uid;
        if (!uid) {
            setError("User not logged in");
            return;
        }

        // Validate starting bid
        const bidAmount = parseFloat(startingBid);
        if (isNaN(bidAmount) || bidAmount < 0.01) {
            setError("Starting bid must be at least $0.01");
            return;
        }

        const endAt = new Date(`${date}T${time}`).toISOString();

        try {
            // Create new listing
            const response = await fetch("/api/create-new-listing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid,
                    title,
                    description,
                    imageUrl,
                    createdBy: userInfo.displayName || "Unknown",
                    startingBid: bidAmount,
                    endAt,
                    itemCategory
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || `Server error status: ${response.status}`);
            }


            console.log("New listing created:", data);
            alert("New listing created successfully!");

            // Reset fields to create new listing
            setTitle('');
            setDescription('');
            setImageUrl('');
            setDate('');
            setTime('');
            setStartingBid('');
            setItemCategory('');

            // Refresh user listings
            if (fetchUserListings && user) {
                fetchUserListings(user.uid);
            }

        } catch (err) {
            console.error("Error creating new listing:", err);
            setError("Failed to save new listing: " + err.message);
            alert("Error creating new listing: " + err.message);
        }
    };
    return (
        <div className="form-create-listing-container">
            <h3> Create A New Listing </h3>
            <h2>Note: You may only have 30 active listings at a time.</h2>
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
                <label>Item Category: </label>
                <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    required
                >
                    <option value="">Select Category</option>
                    <option value="antiques">Antiques</option>
                    <option value="electronics">Electronics</option>
                    <option value="fashion">Fashion</option>
                    <option value="home">Home</option>
                    <option value="toys&hobbies">Toys & Hobbies</option>
                    <option value="books">Books</option>
                    <option value="sports">Sports</option>
                    <option value="vehicles">Vehicles</option>
                    <option value="other">Other</option>
                </select>
                <br />
                <input
                    type="url"
                    placeholder="Image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    required
                />
                <br />
                <div className="datetime-group">
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
                </div>

                <br />
                <label>Starting Bid: </label>
                <input
                    type="number"
                    placeholder="Starting Bid (e.g., 1.99)"
                    value={startingBid}
                    onChange={(e) => setStartingBid(e.target.value)}
                    min="0.01"
                    step="0.01"
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
        fetch("/api/user/info/?" + new URLSearchParams({ uid: user.uid }))
            .then(res => res.json())
            .then(data => { setUserInfo(data) })
            .catch(err => console.error("Error fetching user info:", err));
    }, [user]);

    // get items from MongoDB and sort for user listings
    const fetchUserListings = (uid) => {
        fetch("/api/user_items?" + new URLSearchParams({ uid }))
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
            <a href="index.html"><button>Go to Auction</button></a>
            <UserInfo userInfo={userInfo} userListings={userListings} fetchUserListings={fetchUserListings} user={user} />
        </div>
    )
}

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(<App />);