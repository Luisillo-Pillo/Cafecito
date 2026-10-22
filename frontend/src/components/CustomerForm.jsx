import { useState } from "react";
import { apiFetch } from "../services/api";

function CustomerForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ name: "", phoneOrEmail: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const customer = await apiFetch("/customers", { method: "POST", body: form });
      onCreated(customer);
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

      {error && <p className="form-error">{error}</p>}

      <div className="customer-form-actions">
        <button type="submit" disabled={submitting}>
          Guardar cliente
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
