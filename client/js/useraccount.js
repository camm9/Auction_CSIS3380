const { useState, useEffect } = React;

const UserInfo = ({ userInfo }) => {
    if (!userInfo) return <p>Loading user info....</p>;

    return (
        <div>
            <h3> Account Details </h3>
            <p>Email: {userInfo.email}</p>
            <p>Display Name: {userInfo.displayName} </p>
            <UserListings userInfo={userInfo} />
            <UserBids userInfo={userInfo} />
        </div>
    );
}

const UserListings = ({ userInfo }) => {
    if (!userInfo) return <p>Loading user info....</p>;

    return (
        <div>
            <h3> {userInfo.displayName.toUpperCase()}'s Listings </h3>
            <CreateANewListing userInfo={userInfo} />
        </div>
    )
}

const UserBids = ({ userInfo }) => {
    return (
        <div>
            <h3> {userInfo.displayName.toUpperCase()}'s Bid History </h3>
        </div>
    );
}

const CreateANewListing = ({ userInfo }) => {
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
        console.log("Fetching userInfo for UID:", user.uid);
        fetch("http://localhost:5001/user/info?" + new URLSearchParams({ uid: user.uid }))
            .then(res => res.json())
            .then(data => { console.log(data); setUserInfo(data) })
            .catch(err => console.error("Error fetching user info:", err));
    }, [user]); // run only when user changes ??


    return (
        <div>
            <h1> Your Account</h1>
            <UserInfo userInfo={userInfo} />
        </div>
    )
}

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(<App />);