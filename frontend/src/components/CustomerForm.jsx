import { useState } from "react";
import { apiFetch } from "../services/api";
import Notice from "./Notice";
import "../styles/forms.css";

function CustomerForm({ customer, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: customer?.name ?? "",
    phoneOrEmail: customer?.phoneOrEmail ?? "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const saved = await apiFetch(customer ? `/customers/${customer.id}` : "/customers", {
        method: customer ? "PUT" : "POST",
        body: form,
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <input
        placeholder="Nombre"
        value={form.name}
        onChange={handleChange("name")}
        minLength={2}
        maxLength={100}
        required
      />
      <input
        placeholder="Correo o teléfono (+52...)"
        value={form.phoneOrEmail}
        onChange={handleChange("phoneOrEmail")}
        required
      />

      {error && <Notice>{error}</Notice>}

      <div className="customer-form-actions">
        <button type="submit" disabled={submitting}>
          {customer ? "Guardar cambios" : "Guardar cliente"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export default CustomerForm;
