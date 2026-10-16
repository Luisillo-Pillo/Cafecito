import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import CustomerForm from "../components/CustomerForm";
import { getProductIcon } from "../productIcon";
import { getProductImage } from "../productImages";
import { normalize } from "../utils";

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function cartKey(productId, size) {
  return `${productId}::${size ?? ""}`;
}

function ProductVisual({ product }) {
  const image = getProductImage(product);
  if (image) {
    return <img src={image} alt="" className="pos-card-image" />;
  }
  return (
    <span className="pos-card-icon" aria-hidden="true">
      {getProductIcon(product)}
    </span>
  );
}

function Pos() {
  const [products, setProducts] = useState([]);
  const [productsStatus, setProductsStatus] = useState("loading"); // loading | ready | error
  const [productQuery, setProductQuery] = useState("");
  const [cart, setCart] = useState([]); // [{ product, size, unitPrice, qty }]

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerMatches, setCustomerMatches] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutMessage, setCheckoutMessage] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    apiFetch("/products")
      .then((data) => {
        setProducts(data);
        setProductsStatus("ready");
      })
      .catch(() => setProductsStatus("error"));
  }, []);

  useEffect(() => {
    if (selectedCustomer || customerQuery.trim().length === 0) {
      setCustomerMatches([]);
      return;
    }
    const timeout = setTimeout(() => {
      apiFetch(`/customers?search=${encodeURIComponent(customerQuery.trim())}`)
        .then(setCustomerMatches)
        .catch(() => setCustomerMatches([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerQuery, selectedCustomer]);

  const addToCart = (product, size, unitPrice) => {
    setCheckoutMessage(null);
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product._id === product._id && item.size === size
      );
      if (existing) {
        return prev.map((item) =>
          item.product._id === product._id && item.size === size
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prev, { product, size, unitPrice, qty: 1 }];
    });
  };

  const changeQty = (productId, size, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product._id === productId && item.size === size
            ? { ...item, qty: item.qty + delta }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerQuery("");
    setCustomerMatches([]);
    setShowCustomerForm(false);
  };

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    [cart]
  );

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const filteredProducts = useMemo(() => {
    const q = normalize(productQuery.trim());
    if (!q) return products;
    return products.filter((product) => normalize(product.name).includes(q));
  }, [products, productQuery]);

  const cartQtyByKey = useMemo(() => {
    const map = new Map();
    cart.forEach((item) => map.set(cartKey(item.product._id, item.size), item.qty));
    return map;
  }, [cart]);

  const handleCheckout = async () => {
    setCheckoutError(null);
    setCheckingOut(true);
    try {
      await apiFetch("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer._id,
          items: cart.map(({ product, size, qty }) => ({
            productId: product._id,
            qty,
            ...(size && { size }),
          })),
        }),
      });
      setCart([]);
      setSelectedCustomer(null);
      setCheckoutMessage(`Venta registrada para ${selectedCustomer.name}.`);
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <main className="pos-main">
      <section className="pos-products">
        {productsStatus === "loading" && <p className="pos-empty">Cargando productos...</p>}
        {productsStatus === "error" && (
          <p className="pos-empty">No se pudo conectar con la API.</p>
        )}
        {productsStatus === "ready" && products.length === 0 && (
          <p className="pos-empty">
            Todavía no hay productos. Agrega uno desde la API (POST /api/products).
          </p>
        )}
        {productsStatus === "ready" && products.length > 0 && filteredProducts.length === 0 && (
          <p className="pos-empty">No se encontraron productos para "{productQuery}".</p>
        )}

        <div className="pos-grid">
          {filteredProducts.map((product) => {
            const isBebida = product.category === "bebida" && product.sizes?.length === 3;

            if (isBebida) {
              return (
                <div
                  key={product._id}
                  className={"pos-card pos-card-bebida" + (!product.available ? " is-disabled" : "")}
                >
                  <ProductVisual product={product} />
                  <span className="pos-card-name">{product.name}</span>

                  <div className="pos-size-row">
                    {product.sizes.map((size) => {
                      const qty = cartQtyByKey.get(cartKey(product._id, size.name)) ?? 0;
                      return (
                        <button
                          key={size.name}
                          type="button"
                          className="pos-size-btn"
                          disabled={!product.available}
                          onClick={() => addToCart(product, size.name, size.price)}
                        >
                          <span className="pos-size-name">{size.name}</span>
                          <span className="pos-size-price">{currency.format(size.price)}</span>
                          {qty > 0 && <span className="pos-size-qty">x{qty}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const qtyInCart = cartQtyByKey.get(cartKey(product._id, undefined)) ?? 0;
            return (
              <button
                key={product._id}
                className="pos-card"
                onClick={() => addToCart(product, undefined, product.price)}
                disabled={!product.available}
              >
                {qtyInCart > 0 && <span className="pos-card-badge">{qtyInCart}</span>}
                <ProductVisual product={product} />
                <span className="pos-card-name">{product.name}</span>
                <span className="pos-card-price">{currency.format(product.price)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="pos-cart order-summary">
        <input
          type="text"
          className="pos-search"
          placeholder="Buscar producto por nombre..."
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
        />

        <h2>
          Cuenta
          {itemCount > 0 && (
            <span className="pos-cart-count">
              {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
            </span>
          )}
        </h2>

        {cart.length === 0 ? (
          <p className="pos-empty">Sin productos agregados.</p>
        ) : (
          <ul className="pos-cart-list">
            {cart.map((item) => (
              <li key={cartKey(item.product._id, item.size)} className="pos-cart-item">
                <div className="pos-cart-item-info">
                  <span>
                    {item.product.name}
                    {item.size ? ` (${item.size})` : ""}
                  </span>
                  <span className="pos-cart-item-price">
                    {currency.format(item.unitPrice * item.qty)}
                  </span>
                </div>
                <div className="pos-cart-item-qty">
                  <button onClick={() => changeQty(item.product._id, item.size, -1)}>−</button>
                  <span>{item.qty}</span>
                  <button onClick={() => changeQty(item.product._id, item.size, 1)}>+</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="pos-total">
          <span>Total</span>
          <span>{currency.format(total)}</span>
        </div>

        <div className="pos-customer">
          <h3>Cliente</h3>

          {selectedCustomer ? (
            <div className="pos-customer-selected">
              <div>
                <strong>{selectedCustomer.name}</strong>
                <span className="pos-cart-item-price">{selectedCustomer.email}</span>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)}>
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Buscar por nombre, correo o teléfono"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
              />

              {customerMatches.length > 0 && (
                <ul className="pos-customer-matches">
                  {customerMatches.map((customer) => (
                    <li key={customer._id}>
                      <button type="button" onClick={() => selectCustomer(customer)}>
                        {customer.name} · {customer.email}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!showCustomerForm && (
                <button
                  type="button"
                  className="pos-customer-new"
                  onClick={() => setShowCustomerForm(true)}
                >
                  + Registrar cliente nuevo
                </button>
              )}

              {showCustomerForm && (
                <CustomerForm
                  onCreated={selectCustomer}
                  onCancel={() => setShowCustomerForm(false)}
                />
              )}
            </>
          )}
        </div>

        {checkoutError && <p className="form-error">{checkoutError}</p>}
        {checkoutMessage && <p className="pos-success">{checkoutMessage}</p>}

        <button
          className="pos-checkout"
          disabled={cart.length === 0 || !selectedCustomer || checkingOut}
          onClick={handleCheckout}
        >
          Cobrar
        </button>
        {cart.length > 0 && !selectedCustomer && (
          <p className="pos-hint">Selecciona o registra un cliente para cobrar.</p>
        )}
      </aside>
    </main>
  );
}

export default Pos;
