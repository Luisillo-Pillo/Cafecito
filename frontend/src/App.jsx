import { useState } from "react";
import Pos from "./pages/Pos";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import { getRole, setRole as storeRole } from "./api";
import logo from "./assets/products/americano.svg";

const VIEWS = [
  { id: "pos", label: "Punto de venta", roles: ["vendedor", "admin"] },
  { id: "clientes", label: "Clientes", roles: ["vendedor", "admin"] },
  { id: "productos", label: "Productos", roles: ["admin"] },
];

function App() {
  const [view, setView] = useState("pos");
  const [role, setRole] = useState(getRole);

  const visibleViews = VIEWS.filter((v) => v.roles.includes(role));
  const activeView = visibleViews.some((v) => v.id === view) ? view : "pos";

  const changeRole = (nextRole) => {
    storeRole(nextRole);
    setRole(nextRole);
  };

  return (
    <div className="pos">
      <header className="pos-header">
        <h1>
          <img src={logo} alt="Cafecito" className="pos-logo" />
          Cafecito
        </h1>
        <nav className="pos-nav">
          {visibleViews.map((v) => (
            <button
              key={v.id}
              className={activeView === v.id ? "is-active" : ""}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>

        <label className="pos-role">
          <span>Rol</span>
          <select value={role} onChange={(e) => changeRole(e.target.value)}>
            <option value="vendedor">Vendedor</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
      </header>

      {/* key={role}: al cambiar de rol las pantallas se recargan con los permisos nuevos */}
      {activeView === "pos" && <Pos key={role} />}
      {activeView === "clientes" && <Customers key={role} role={role} />}
      {activeView === "productos" && <Products key={role} />}
    </div>
  );
}

export default App;
