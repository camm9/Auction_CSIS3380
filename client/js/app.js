const { useState, useEffect } = React;


const ItemModal = ({ item, onClose }) => {
    return (
        <div class="item-modal-overlay">
            <div class="item-modal">
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
    )
};

const ItemCard = ({ item, onPlaceBid }) => {
    return (
        <div class="item-card">
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