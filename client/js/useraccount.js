const { useState, useEffect } = React;

const UserInfo = ({ userInfo }) => {
    if (!userInfo) return <p>Loading user info....</p>;

    return (
        <div>
            <h3> Account Details </h3>
            <p>Email: {userInfo.email}</p>
            <p>Display Name: {userInfo.displayName} </p>
        </div>
    );
}

const UserListings = () => {
    return (
        <div>
            <h3> Your Listings </h3>
        </div>
    )
}

const UserBids = () => {
    return (
        <div>
            <h3> Your Bid History </h3>
        </div>
    );
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
            <UserListings />
            <UserBids />
        </div>
    )
}

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(<App />);