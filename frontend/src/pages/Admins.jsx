import { useCallback, useEffect, useState } from "react";
import { apiFetch, getSessionEmail } from "../services/api";
import PasswordInput from "../components/PasswordInput";
import Notice from "../components/Notice";
import StateMessage, { LoadError } from "../components/StateMessage";
import { dateTimeFormat } from "../utils";
import "../styles/layout.css";
import "../styles/lists.css";
import "../styles/forms.css";
import "./Admins.css";

const MIN_PASSWORD_LENGTH = 8;
const EMPTY_FORM = { name: "", email: "", password: "", confirm: "" };

function Admins() {
  const [admins, setAdmins] = useState([]);
  const [owner, setOwner] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadAdmins = useCallback(() => {
    return apiFetch("/admins")
      .then((res) => {
        setAdmins(res.data);
        setOwner(res.owner);
        setStatus("ready");
      })
      .catch((err) => {
        setLoadError(err);
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden. Escríbelas de nuevo.");
      return;
    }
    setSaving(true);
    try {
      const created = await apiFetch("/admins", {
        method: "POST",
        body: { name: form.name, email: form.email, password: form.password },
      });
      setMessage(`${created.name} ya puede iniciar sesión como administrador.`);
      setForm(EMPTY_FORM);
      loadAdmins();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin) => {
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/admins/${admin.id}`, { method: "DELETE" });
      setMessage(`${admin.name} ya no tiene acceso de administrador.`);
      setDeletingId(null);
      loadAdmins();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="pos-main">
      <section className="pos-products">
        <h2>Administradores</h2>
        {status === "loading" && (
          <StateMessage illustration="loading" title="Cargando administradores…" />
        )}
        {status === "error" && (
          <LoadError
            error={loadError}
            subject="los administradores"
            onRetry={() => {
              setStatus("loading");
              loadAdmins();
            }}
          />
        )}

        <ul className="admin-products">
          {owner && (
            <li className="admin-product">
              <div className="admin-product-info">
                <strong>
                  {owner}
                  <span className="admin-tag is-owner">Principal</span>
                </strong>
                <span className="pos-card-price">Cuenta principal del sistema</span>
              </div>
            </li>
          )}
          {admins.map((admin) => (
            <li key={admin.id} className="admin-product">
              <div className="admin-product-info">
                <strong>{admin.name}</strong>
                <span className="pos-card-price">{admin.email}</span>
                <span className="pos-card-price">
                  Registrado el {dateTimeFormat.format(new Date(admin.createdAt))}
                  {admin.createdBy && ` por ${admin.createdBy}`}
                </span>
              </div>

              {admin.email !== getSessionEmail() && (
                <div className="admin-product-actions">
                  {deletingId === admin.id ? (
                    <>
                      <button type="button" className="danger" onClick={() => handleDelete(admin)}>
                        Eliminar
                      </button>
                      <button type="button" onClick={() => setDeletingId(null)}>
                        No
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setDeletingId(admin.id)}>
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <aside className="pos-cart order-summary">
        <form className="product-form" onSubmit={handleSubmit}>
          <h3>Nuevo administrador</h3>

          <label>
            Nombre
            <input value={form.name} onChange={set("name")} minLength={2} maxLength={100} required />
          </label>

          <label>
            Correo
            <input type="email" value={form.email} onChange={set("email")} autoComplete="off" required />
          </label>

          <label>
            Contraseña (mínimo {MIN_PASSWORD_LENGTH} caracteres)
            <PasswordInput
              value={form.password}
              onChange={set("password")}
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Confirmar contraseña
            <PasswordInput
              value={form.confirm}
              onChange={set("confirm")}
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              required
            />
          </label>

          {error && <Notice>{error}</Notice>}
          {message && <Notice type="success">{message}</Notice>}

          <div className="customer-form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Registrando..." : "Registrar administrador"}
            </button>
          </div>
        </form>
      </aside>
    </main>
  );
}

export default Admins;
