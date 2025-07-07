const { useState, useEffect } = React;

const UserInfo = () => {
    const [displayName, setDisplayName] = useState('');

    return (
        <div>
            <h3> Account Details </h3>
            <p>Email: </p>
            <p>Display Name: </p>
        </div>
    )
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
    )
}


const App = () => {



    return (
        <div>
            <h1> Your Account</h1>
            <UserInfo />
            <UserListings />
            <UserBids />
        </div>
    )
}

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(<App />);