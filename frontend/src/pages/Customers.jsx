import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import CustomerForm from "../components/CustomerForm";
import Ticket from "../components/Ticket";
import { currency, dateTimeFormat, discountLabel } from "../utils";

function Customers({ role }) {
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [selected, setSelected] = useState(null);
  const [sales, setSales] = useState([]);
  const [salesStatus, setSalesStatus] = useState("idle"); // idle | loading | ready | error
  const [openSale, setOpenSale] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState(null);

  const loadCustomers = useCallback((q = "") => {
    setStatus("loading");
    const params = new URLSearchParams({ limit: "100" });
    if (q.trim()) params.set("q", q.trim());
    return apiFetch(`/customers?${params}`)
      .then((res) => {
        setCustomers(res.data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadCustomers(query), 300);
    return () => clearTimeout(timeout);
  }, [query, loadCustomers]);

  const selectCustomer = (customer) => {
    setSelected(customer);
    setConfirmDelete(false);
    setActionError(null);
    setSalesStatus("loading");
    apiFetch(`/customers/${customer.id}/sales?limit=50`)
      .then((res) => {
        setSales(res.data);
        setSalesStatus("ready");
      })
      .catch(() => setSalesStatus("error"));
  };

  const deleteCustomer = async () => {
    setActionError(null);
    try {
      await apiFetch(`/customers/${selected.id}`, { method: "DELETE" });
      setSelected(null);
      setConfirmDelete(false);
      loadCustomers(query);
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <main className="pos-main">
      <section className="pos-products">
        <div className="customers-toolbar">
          <input
            type="text"
            placeholder="Buscar cliente por nombre, correo o teléfono..."
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
              loadCustomers(query);
              selectCustomer(customer);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {status === "loading" && customers.length === 0 && (
          <p className="pos-empty">Cargando clientes...</p>
        )}
        {status === "error" && <p className="pos-empty">No se pudo conectar con la API.</p>}
        {status === "ready" && customers.length === 0 && (
          <p className="pos-empty">
            {query ? `No se encontraron clientes para "${query}".` : "No hay clientes registrados todavía."}
          </p>
        )}

        <ul className="customers-list">
          {customers.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                className={
                  "customers-list-item" + (selected?.id === customer.id ? " is-active" : "")
                }
                onClick={() => selectCustomer(customer)}
              >
                <span className="customers-list-main">
                  <span>{customer.name}</span>
                  <span className="pos-card-price">{customer.phoneOrEmail}</span>
                </span>
                <span className="customers-list-meta">
                  {customer.purchasesCount} {customer.purchasesCount === 1 ? "compra" : "compras"}
                  <span className="pos-discount-badge">
                    {customer.nextDiscountPercent}%
                  </span>
                </span>
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
              <span>{selected.phoneOrEmail}</span>
              <span>
                {selected.purchasesCount} compras ·{" "}
                {discountLabel(selected.nextDiscountPercent)} en su próxima compra
              </span>

              {role === "admin" && (
                <div className="customer-admin-actions">
                  {confirmDelete ? (
                    <>
                      <span>¿Eliminar este cliente?</span>
                      <button type="button" className="danger" onClick={deleteCustomer}>
                        Sí, eliminar
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)}>
                        No
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)}>
                      Eliminar cliente
                    </button>
                  )}
                </div>
              )}
              {actionError && <p className="form-error">{actionError}</p>}
            </div>

            {salesStatus === "loading" && <p className="pos-empty">Cargando...</p>}
            {salesStatus === "error" && (
              <p className="pos-empty">No se pudo cargar el historial.</p>
            )}
            {salesStatus === "ready" && sales.length === 0 && (
              <p className="pos-empty">Sin compras registradas.</p>
            )}

            <ul className="pos-cart-list">
              {sales.map((sale) => (
                <li key={sale.saleId}>
                  <button type="button" className="order-item" onClick={() => setOpenSale(sale)}>
                    <div className="pos-cart-item-info">
                      <span>{dateTimeFormat.format(new Date(sale.createdAt))}</span>
                      <span className="pos-cart-item-price">
                        {sale.items
                          .map(
                            (item) =>
                              `${item.productName}${item.size ? ` (${item.size})` : ""} x${item.quantity}`
                          )
                          .join(", ")}
                      </span>
                      {sale.discountPercent > 0 && (
                        <span className="pos-cart-item-price">
                          Descuento {sale.discountPercent}%
                        </span>
                      )}
                    </div>
                    <strong>{currency.format(sale.total)}</strong>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      {openSale && (
        <Ticket sale={openSale} onClose={() => setOpenSale(null)} closeLabel="Cerrar" />
      )}
    </main>
  );
}

export default Customers;
