import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../services/api";
import CustomerForm from "../components/CustomerForm";
import Ticket from "../components/Ticket";
import Notice from "../components/Notice";
import StateMessage, { LoadError } from "../components/StateMessage";
import { currency, dateTimeFormat, discountLabel } from "../utils";
import "../styles/layout.css";
import "../styles/lists.css";
import "../styles/forms.css";
import "./Customers.css";

function Customers({ role }) {
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [selected, setSelected] = useState(null);
  const [sales, setSales] = useState([]);
  const [salesStatus, setSalesStatus] = useState("idle");
  const [salesError, setSalesError] = useState(null);
  const [openSale, setOpenSale] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const listRequest = useRef(0);
  const salesRequest = useRef(0);

  const loadCustomers = useCallback((q = "") => {
    const request = ++listRequest.current;
    setStatus("loading");
    const params = new URLSearchParams({ limit: "100" });
    if (q.trim()) params.set("q", q.trim());
    return apiFetch(`/customers?${params}`)
      .then((res) => {
        if (request !== listRequest.current) return;
        setCustomers(res.data);
        setStatus("ready");
      })
      .catch((err) => {
        if (request !== listRequest.current) return;
        setLoadError(err);
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadCustomers(query), 300);
    return () => clearTimeout(timeout);
  }, [query, loadCustomers]);

  const selectCustomer = (customer) => {
    setSelected(customer);
    setConfirmDelete(false);
    setEditing(false);
    setActionError(null);
    setSalesStatus("loading");
    const request = ++salesRequest.current;
    apiFetch(`/customers/${customer.id}/sales?limit=50`)
      .then((res) => {
        if (request !== salesRequest.current) return;
        setSales(res.data);
        setSalesStatus("ready");
      })
      .catch((err) => {
        if (request !== salesRequest.current) return;
        setSalesError(err);
        setSalesStatus("error");
      });
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
            onSaved={(customer) => {
              setShowForm(false);
              loadCustomers(query);
              selectCustomer(customer);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {status === "loading" && customers.length === 0 && (
          <StateMessage illustration="loading" title="Cargando clientes…" />
        )}
        {status === "error" && (
          <LoadError error={loadError} subject="los clientes" onRetry={() => loadCustomers(query)} />
        )}
        {status === "ready" && customers.length === 0 && query.trim() && (
          <StateMessage illustration="search" title={`No encontramos clientes con «${query.trim()}»`}>
            Busca por nombre, correo o teléfono, o regístralo como cliente nuevo.
          </StateMessage>
        )}
        {status === "ready" && customers.length === 0 && !query.trim() && (
          <StateMessage illustration="customers" title="Aún no hay clientes registrados">
            Registra al primero con «+ Nuevo cliente» para que empiece a acumular descuentos.
          </StateMessage>
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

        {!selected && (
          <StateMessage illustration="customers" title="Elige un cliente" compact>
            Aquí verás sus datos, su descuento y el historial de sus compras.
          </StateMessage>
        )}

        {selected && (
          <>
            <div className="customer-detail">
              {editing ? (
                <CustomerForm
                  key={selected.id}
                  customer={selected}
                  onSaved={(updated) => {
                    setEditing(false);
                    setSelected(updated);
                    loadCustomers(query);
                  }}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <>
                  <strong>{selected.name}</strong>
                  <span>{selected.phoneOrEmail}</span>
                  <span>
                    {selected.purchasesCount} compras ·{" "}
                    {discountLabel(selected.nextDiscountPercent)} en su próxima compra
                  </span>
                </>
              )}

              {!editing && (
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
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setEditing(true);
                        }}
                      >
                        Editar cliente
                      </button>
                      {role === "admin" && (
                        <button type="button" onClick={() => setConfirmDelete(true)}>
                          Eliminar cliente
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              {actionError && <Notice>{actionError}</Notice>}
            </div>

            {salesStatus === "loading" && (
              <StateMessage illustration="loading" title="Buscando sus compras…" compact />
            )}
            {salesStatus === "error" && (
              <LoadError
                error={salesError}
                subject="sus compras"
                onRetry={() => selectCustomer(selected)}
                compact
              />
            )}
            {salesStatus === "ready" && sales.length === 0 && (
              <StateMessage illustration="receipt" title="Todavía no tiene compras" compact>
                Cuando compre, sus tickets aparecerán aquí.
              </StateMessage>
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
