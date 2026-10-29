import { useEffect, useState } from "react";
import { loginAdmin } from "../services/api";
import Notice from "./Notice";
import PasswordInput from "./PasswordInput";

function AdminLogin({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const closeOnEscape = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await loginAdmin(email, password);
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="login-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
      <form className="login-card customer-form" onSubmit={handleSubmit}>
        <h2 id="admin-login-title">Ingresar como administrador</h2>
        <input
          type="email"
          placeholder="Correo"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <PasswordInput
          placeholder="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <Notice>{error}</Notice>}

        <div className="customer-form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminLogin;
