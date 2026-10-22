import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { getProductIcon } from "../productIcon";
import { getProductImage } from "../productImages";
import { currency, normalize } from "../utils";

const CATEGORIES = [
  { value: "bebida", label: "Bebida (3 tamaños)" },
  { value: "postre", label: "Postre" },
  { value: "snack", label: "Snack" },
  { value: "otro", label: "Otro" },
];

const DEFAULT_SIZES = [
  { name: "Chico", price: "" },
  { name: "Mediano", price: "" },
  { name: "Grande", price: "" },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "otro",
  price: "",
  sizes: DEFAULT_SIZES,
  stock: "",
  available: true,
};

function toForm(product) {
  return {
    name: product.name,
    description: product.description ?? "",
    category: product.category,
    price: product.price ?? "",
    sizes:
      product.sizes?.length === 3
        ? product.sizes.map((s) => ({ name: s.name, price: s.price }))
        : DEFAULT_SIZES,
    stock: product.stock,
    available: product.available,
  };
}

function toBody(form) {
  const body = {
    name: form.name.trim(),
    description: form.description,
    category: form.category,
    stock: form.stock === "" ? undefined : Number(form.stock),
    available: form.available,
  };
  if (form.category === "bebida") {
    body.sizes = form.sizes.map((s) => ({
      name: s.name.trim(),
      price: s.price === "" ? undefined : Number(s.price),
    }));
  } else {
    body.price = form.price === "" ? undefined : Number(form.price);
  }
  return body;
}

function priceSummary(product) {
  if (product.category === "bebida" && product.sizes?.length) {
    return product.sizes.map((s) => `${s.name} ${currency.format(s.price)}`).join(" · ");
  }
  return currency.format(product.price);
}

function ProductForm({ product, onSaved, onCancel }) {
  const [form, setForm] = useState(product ? toForm(product) : EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const setSize = (index, field) => (e) =>
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.map((s, i) => (i === index ? { ...s, [field]: e.target.value } : s)),
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await apiFetch(product ? `/products/${product.id}` : "/products", {
        method: product ? "PUT" : "POST",
        body: toBody(form),
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isBebida = form.category === "bebida";

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <h3>{product ? `Editar: ${product.name}` : "Nuevo producto"}</h3>

      <label>
        Nombre
        <input value={form.name} onChange={set("name")} maxLength={100} required />
      </label>

      <label>
        Descripción / ingredientes
        <input value={form.description} onChange={set("description")} />
      </label>

      <div className="product-form-row">
        <label>
          Categoría
          <select value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Stock
          <input type="number" min="0" step="1" value={form.stock} onChange={set("stock")} required />
        </label>
      </div>

      {isBebida ? (
        <fieldset className="product-form-sizes">
          <legend>Tamaños y precios</legend>
          {form.sizes.map((size, i) => (
            <div key={i} className="product-form-row">
              <input value={size.name} onChange={setSize(i, "name")} required aria-label="Tamaño" />
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Precio"
                value={size.price}
                onChange={setSize(i, "price")}
                required
                aria-label={`Precio ${size.name}`}
              />
            </div>
          ))}
        </fieldset>
      ) : (
        <label>
          Precio
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.price}
            onChange={set("price")}
            required
          />
        </label>
      )}

      <label className="product-form-check">
        <input type="checkbox" checked={form.available} onChange={set("available")} />
        Disponible para venta
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="customer-form-actions">
        <button type="submit" disabled={saving}>
          {product ? "Guardar cambios" : "Crear producto"}
        </button>
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Products() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | producto
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const loadProducts = useCallback(() => {
    return apiFetch("/products?limit=100")
      .then((res) => {
        setProducts([...res.data].sort((a, b) => a.name.localeCompare(b.name, "es")));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSaved = (saved) => {
    setMessage(`"${saved.name}" guardado.`);
    setEditing(null);
    loadProducts();
  };

  const handleDelete = async (product) => {
    setError(null);
    try {
      await apiFetch(`/products/${product.id}`, { method: "DELETE" });
      setMessage(`"${product.name}" eliminado.`);
      setDeletingId(null);
      if (editing?.id === product.id) setEditing(null);
      loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const q = normalize(query.trim());
  const filtered = q ? products.filter((p) => normalize(p.name).includes(q)) : products;

  return (
    <main className="pos-main">
      <section className="pos-products">
        <div className="customers-toolbar">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setEditing("new");
            }}
          >
            + Nuevo producto
          </button>
        </div>

        {message && <p className="pos-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        {status === "loading" && <p className="pos-empty">Cargando productos...</p>}
        {status === "error" && <p className="pos-empty">No se pudo conectar con la API.</p>}
        {status === "ready" && filtered.length === 0 && (
          <p className="pos-empty">No hay productos que mostrar.</p>
        )}

        <ul className="admin-products">
          {filtered.map((product) => {
            const image = getProductImage(product);
            return (
              <li
                key={product.id}
                className={"admin-product" + (editing?.id === product.id ? " is-active" : "")}
              >
                {image ? (
                  <img src={image} alt="" className="admin-product-image" />
                ) : (
                  <span className="admin-product-icon" aria-hidden="true">
                    {getProductIcon(product)}
                  </span>
                )}

                <div className="admin-product-info">
                  <strong>
                    {product.name}
                    {!product.available && <span className="admin-tag">No disponible</span>}
                  </strong>
                  <span className="pos-card-price">{priceSummary(product)}</span>
                  <span className={"pos-stock" + (product.stock <= 5 ? " is-low" : "")}>
                    Stock: {product.stock}
                  </span>
                </div>

                <div className="admin-product-actions">
                  {deletingId === product.id ? (
                    <>
                      <button type="button" className="danger" onClick={() => handleDelete(product)}>
                        Eliminar
                      </button>
                      <button type="button" onClick={() => setDeletingId(null)}>
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMessage(null);
                          setEditing(product);
                        }}
                      >
                        Editar
                      </button>
                      <button type="button" onClick={() => setDeletingId(product.id)}>
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="pos-cart order-summary">
        {editing ? (
          <ProductForm
            key={editing === "new" ? "new" : editing.id}
            product={editing === "new" ? null : editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <h2>Productos</h2>
            <p className="pos-empty">
              Elige "Editar" en un producto o crea uno nuevo. El stock baja solo con cada venta.
            </p>
          </>
        )}
      </aside>
    </main>
  );
}

export default Products;
