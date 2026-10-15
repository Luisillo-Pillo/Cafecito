import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); // [{ product, qty }]
  const [status, setStatus] = useState("loading"); // loading | ready | error

  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const changeQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product._id === productId ? { ...item, qty: item.qty + delta } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.qty, 0),
    [cart]
  );

  return (
    <div className="pos">
      <header className="pos-header">
        <h1>☕ Cafecito</h1>
        <span className="pos-subtitle">Punto de venta</span>
      </header>

      <main className="pos-main">
        <section className="pos-products">
          {status === "loading" && <p className="pos-empty">Cargando productos...</p>}
          {status === "error" && (
            <p className="pos-empty">No se pudo conectar con la API.</p>
          )}
          {status === "ready" && products.length === 0 && (
            <p className="pos-empty">
              Todavía no hay productos. Agrega uno desde la API (POST /api/products).
            </p>
          )}

          <div className="pos-grid">
            {products.map((product) => (
              <button
                key={product._id}
                className="pos-card"
                onClick={() => addToCart(product)}
                disabled={!product.available}
              >
                <span className="pos-card-name">{product.name}</span>
                <span className="pos-card-price">{currency.format(product.price)}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="pos-cart">
          <h2>Cuenta</h2>

          {cart.length === 0 ? (
            <p className="pos-empty">Sin productos agregados.</p>
          ) : (
            <ul className="pos-cart-list">
              {cart.map(({ product, qty }) => (
                <li key={product._id} className="pos-cart-item">
                  <div className="pos-cart-item-info">
                    <span>{product.name}</span>
                    <span className="pos-cart-item-price">
                      {currency.format(product.price * qty)}
                    </span>
                  </div>
                  <div className="pos-cart-item-qty">
                    <button onClick={() => changeQty(product._id, -1)}>−</button>
                    <span>{qty}</span>
                    <button onClick={() => changeQty(product._id, 1)}>+</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="pos-total">
            <span>Total</span>
            <span>{currency.format(total)}</span>
          </div>

          <button
            className="pos-checkout"
            disabled={cart.length === 0}
            onClick={() => setCart([])}
          >
            Cobrar
          </button>
        </aside>
      </main>
    </div>
  );
}

export default App;
