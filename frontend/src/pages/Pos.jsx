import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import CustomerForm from "../components/CustomerForm";
import Ticket from "../components/Ticket";
import { getProductIcon } from "../productIcon";
import { getProductImage } from "../productImages";
import {
  normalize,
  currency,
  PAYMENT_METHODS,
  previewDiscount,
  discountLabel,
} from "../utils";

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

function StockLabel({ product, inCart }) {
  const left = product.stock - inCart;
  if (product.stock === 0) return <span className="pos-stock is-out">Agotado</span>;
  return (
    <span className={"pos-stock" + (left <= 5 ? " is-low" : "")}>
      {left <= 0 ? "Sin más stock" : `Quedan ${left}`}
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

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastSale, setLastSale] = useState(null); // venta recién cobrada → muestra ticket

  const loadProducts = useCallback(() => {
    return apiFetch("/products?limit=100")
      .then((res) => {
        setProducts(res.data);
        setProductsStatus("ready");
      })
      .catch(() => setProductsStatus("error"));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (selectedCustomer || customerQuery.trim().length === 0) {
      setCustomerMatches([]);
      return;
    }
    const timeout = setTimeout(() => {
      apiFetch(`/customers?q=${encodeURIComponent(customerQuery.trim())}&limit=8`)
        .then((res) => setCustomerMatches(res.data))
        .catch(() => setCustomerMatches([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerQuery, selectedCustomer]);

  // Unidades en el carrito por producto (los tamaños de una bebida comparten stock)
  const cartQtyByProduct = useMemo(() => {
    const map = new Map();
    cart.forEach((item) => map.set(item.product.id, (map.get(item.product.id) ?? 0) + item.qty));
    return map;
  }, [cart]);

  const cartQtyByKey = useMemo(() => {
    const map = new Map();
    cart.forEach((item) => map.set(cartKey(item.product.id, item.size), item.qty));
    return map;
  }, [cart]);

  const canAddMore = (product) =>
    product.available && (cartQtyByProduct.get(product.id) ?? 0) < product.stock;

  const addToCart = (product, size, unitPrice) => {
    if (!canAddMore(product)) return;
    setCheckoutError(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.size === size);
      if (existing) {
        return prev.map((item) =>
          item === existing ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, size, unitPrice, qty: 1 }];
    });
  };

  const changeQty = (item, delta) => {
    if (delta > 0 && !canAddMore(item.product)) return;
    setCart((prev) =>
      prev
        .map((line) => (line === item ? { ...line, qty: line.qty + delta } : line))
        .filter((line) => line.qty > 0)
    );
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerQuery("");
    setCustomerMatches([]);
    setShowCustomerForm(false);
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    [cart]
  );
  const discountPercent = selectedCustomer ? previewDiscount(selectedCustomer.purchasesCount) : 0;
  const discountAmount = Math.round(subtotal * discountPercent) / 100;
  const total = subtotal - discountAmount;

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const filteredProducts = useMemo(() => {
    const q = normalize(productQuery.trim());
    if (!q) return products;
    return products.filter((product) => normalize(product.name).includes(q));
  }, [products, productQuery]);

  const handleCheckout = async () => {
    setCheckoutError(null);
    setCheckingOut(true);
    try {
      const sale = await apiFetch("/sales", {
        method: "POST",
        body: {
          customerId: selectedCustomer?.id ?? null,
          paymentMethod,
          items: cart.map(({ product, size, qty }) => ({
            productId: product.id,
            quantity: qty,
            ...(size && { size }),
          })),
        },
      });
      setLastSale(sale);
      setCart([]);
      setSelectedCustomer(null);
      setPaymentMethod("cash");
      loadProducts(); // el stock cambió
    } catch (err) {
      setCheckoutError(err.message);
      // Si falló por stock, refresca para mostrar las existencias reales
      if (err.status === 400) loadProducts();
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
            Todavía no hay productos. Un administrador puede agregarlos en la pestaña Productos.
          </p>
        )}
        {productsStatus === "ready" && products.length > 0 && filteredProducts.length === 0 && (
          <p className="pos-empty">No se encontraron productos para "{productQuery}".</p>
        )}

        <div className="pos-grid">
          {filteredProducts.map((product) => {
            const isBebida = product.category === "bebida" && product.sizes?.length === 3;
            const inCart = cartQtyByProduct.get(product.id) ?? 0;
            const enabled = canAddMore(product);
            const soldOut = !product.available || product.stock === 0;

            if (isBebida) {
              return (
                <div
                  key={product.id}
                  className={"pos-card pos-card-bebida" + (soldOut ? " is-disabled" : "")}
                >
                  <ProductVisual product={product} />
                  <span className="pos-card-name">{product.name}</span>
                  <StockLabel product={product} inCart={inCart} />

                  <div className="pos-size-row">
                    {product.sizes.map((size) => {
                      const qty = cartQtyByKey.get(cartKey(product.id, size.name)) ?? 0;
                      return (
                        <button
                          key={size.name}
                          type="button"
                          className="pos-size-btn"
                          disabled={!enabled}
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

            const qtyInCart = cartQtyByKey.get(cartKey(product.id, undefined)) ?? 0;
            return (
              <button
                key={product.id}
                className="pos-card"
                onClick={() => addToCart(product, undefined, product.price)}
                disabled={!enabled}
              >
                {qtyInCart > 0 && <span className="pos-card-badge">{qtyInCart}</span>}
                <ProductVisual product={product} />
                <span className="pos-card-name">{product.name}</span>
                <span className="pos-card-price">{currency.format(product.price)}</span>
                <StockLabel product={product} inCart={inCart} />
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
              <li key={cartKey(item.product.id, item.size)} className="pos-cart-item">
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
                  <button onClick={() => changeQty(item, -1)} aria-label="Quitar uno">
                    −
                  </button>
                  <span>{item.qty}</span>
                  <button
                    onClick={() => changeQty(item, 1)}
                    disabled={!canAddMore(item.product)}
                    aria-label="Agregar uno"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="pos-customer">
          <h3>Cliente (opcional)</h3>

          {selectedCustomer ? (
            <div className="pos-customer-selected">
              <div>
                <strong>{selectedCustomer.name}</strong>
                <span className="pos-cart-item-price">{selectedCustomer.phoneOrEmail}</span>
                <span className="pos-discount-badge">
                  {discountLabel(previewDiscount(selectedCustomer.purchasesCount))}
                </span>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)}>
                Quitar
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
                    <li key={customer.id}>
                      <button type="button" onClick={() => selectCustomer(customer)}>
                        {customer.name} · {customer.phoneOrEmail}
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

              <p className="pos-hint pos-hint-left">
                Sin cliente se cobra como público general, sin descuento.
              </p>
            </>
          )}
        </div>

        <div className="pos-totals">
          <div>
            <span>Subtotal</span>
            <span>{currency.format(subtotal)}</span>
          </div>
          {discountPercent > 0 && (
            <div className="pos-totals-discount">
              <span>Descuento {discountPercent}%</span>
              <span>−{currency.format(discountAmount)}</span>
            </div>
          )}
          <div className="pos-total">
            <span>Total</span>
            <span>{currency.format(total)}</span>
          </div>
        </div>

        <label className="pos-payment">
          <span>Método de pago</span>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </label>

        {checkoutError && <p className="form-error">{checkoutError}</p>}

        <button
          className="pos-checkout"
          disabled={cart.length === 0 || checkingOut}
          onClick={handleCheckout}
        >
          {checkingOut ? "Cobrando..." : `Cobrar ${currency.format(total)}`}
        </button>
      </aside>

      {lastSale && <Ticket sale={lastSale} onClose={() => setLastSale(null)} />}
    </main>
  );
}

export default Pos;
