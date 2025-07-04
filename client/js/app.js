const { useState, useEffect } = React;


const ItemCard = (item) => {

    return (
        <div class="item-card">
            <div key={item._id}>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <img src={item.imageUrl} alt={item.title} width="150" />
                <p>Current Bid: $</p>
                <button>Place Bid</button>
            </div>
        </div>
    );
};

const App = () => {
    const [items, setItems] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5001/api/items")
            .then(res => res.json())
            .then(data => setItems(data))
            .catch(err => console.error("Error fetching items:", err));
    }, []);

    return (
        <div>
            <h1>Auction</h1>
            <div class="item-list">
                {items.map(item => <ItemCard
                    key={item._id}
                    title={item.title}
                    description={item.description}
                    imageUrl={item.imageUrl} />
                )}
            </div>
        </div>
    );
};

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(<App />);