const { useState, useEffect } = React;


const ItemCard = () => {
    const [items, setItems] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5001/api/items")
            .then(res => res.json())
            .then(data => setItems(data))
            .catch(err => console.error("Error fetching items:", err));
    }, []);

    return (
        <div class="item-card">
            {items.map(item => (
                <div key={item._id}>
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                    <img src={item.imageUrl} alt={item.title} width="150" />
                </div>
            ))}
        </div>
    );
};

const App = () => {
    return (
        <div>
            <h1>Auction</h1>
            <ItemCard />
        </div>
    );
};

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(<App />);