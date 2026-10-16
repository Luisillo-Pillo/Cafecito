import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import CustomerForm from "../components/CustomerForm";

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [selected, setSelected] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState("idle"); // idle | loading | ready | error

  const loadCustomers = () => {
    setStatus("loading");
    apiFetch("/customers")
      .then((data) => {
        setCustomers(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(loadCustomers, []);

  const selectCustomer = (customer) => {
    setSelected(customer);
    setOrdersStatus("loading");
    apiFetch(`/customers/${customer._id}/orders`)
      .then((data) => {
        setOrders(data);
        setOrdersStatus("ready");
      })
      .catch(() => setOrdersStatus("error"));
  };

  const filtered = customers.filter((customer) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      customer.name.toLowerCase().includes(q) ||
      customer.email.toLowerCase().includes(q) ||
      customer.phone.toLowerCase().includes(q)
    );
  });

  return (
    <main className="pos-main">
      <section className="pos-products">
        <div className="customers-toolbar">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? "Cancelar" : "+ Nuevo cliente"}
          </button>
        </div>

        {showForm && (
          <CustomerForm
            onCreated={(customer) => {
              setShowForm(false);
              loadCustomers();
              selectCustomer(customer);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {status === "loading" && <p className="pos-empty">Cargando clientes...</p>}
        {status === "error" && <p className="pos-empty">No se pudo conectar con la API.</p>}
        {status === "ready" && filtered.length === 0 && (
          <p className="pos-empty">No hay clientes registrados todavía.</p>
        )}

        <ul className="customers-list">
          {filtered.map((customer) => (
            <li key={customer._id}>
              <button
                type="button"
                className={
                  "customers-list-item" +
                  (selected?._id === customer._id ? " is-active" : "")
                }
                onClick={() => selectCustomer(customer)}
              >
                <span>{customer.name}</span>
                <span className="pos-card-price">{customer.email}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <aside className="pos-cart">
        <h2>Historial de compras</h2>

        {!selected && <p className="pos-empty">Selecciona un cliente para ver sus compras.</p>}

        {selected && (
          <>
            <div className="customer-detail">
              <strong>{selected.name}</strong>
              <span>{selected.email}</span>
              <span>{selected.phone}</span>
            </div>

            {ordersStatus === "loading" && <p className="pos-empty">Cargando...</p>}
            {ordersStatus === "error" && (
              <p className="pos-empty">No se pudo cargar el historial.</p>
            )}
            {ordersStatus === "ready" && orders.length === 0 && (
              <p className="pos-empty">Sin compras registradas.</p>
            )}

            <ul className="pos-cart-list">
              {orders.map((order) => (
                <li key={order._id} className="order-item">
                  <div className="pos-cart-item-info">
                    <span>{dateFormat.format(new Date(order.createdAt))}</span>
                    <span className="pos-cart-item-price">
                      {order.items
                        .map(
                          (item) =>
                            `${item.name}${item.size ? ` (${item.size})` : ""} x${item.qty}`
                        )
                        .join(", ")}
                    </span>
                  </div>
                  <strong>{currency.format(order.total)}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </main>
  );
}

export default Customers;
