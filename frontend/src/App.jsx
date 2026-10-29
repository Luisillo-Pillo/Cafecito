import { useEffect, useState } from "react";
import Pos from "./pages/Pos";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Admins from "./pages/Admins";
import AdminLogin from "./components/AdminLogin";
import { getRole, getSessionEmail, logout, onRoleChange } from "./services/api";

const VIEWS = [
  { id: "pos", label: "Punto de venta", roles: ["vendedor", "admin"] },
  { id: "clientes", label: "Clientes", roles: ["vendedor", "admin"] },
  { id: "productos", label: "Productos", roles: ["admin"] },
  { id: "admins", label: "Administradores", roles: ["admin"] },
];

function App() {
  const [view, setView] = useState("pos");
  const [role, setRole] = useState(getRole);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => onRoleChange(setRole), []);

  const visibleViews = VIEWS.filter((v) => v.roles.includes(role));
  const activeView = visibleViews.some((v) => v.id === view) ? view : "pos";

  const changeRole = (nextRole) => {
    if (nextRole === "admin") setShowLogin(true);
    else logout();
  };

  return (
    <div className="pos">
      <header className="pos-header">
        <h1>
          <img src="/favicon.svg" alt="" className="pos-logo" />
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
        {role === "admin" && (
          <div className="pos-session">
            <span>{getSessionEmail()}</span>
            <button type="button" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {showLogin && <AdminLogin onClose={() => setShowLogin(false)} />}

      {/* key={role}: al cambiar de rol las pantallas se recargan con los permisos nuevos */}
      {activeView === "pos" && <Pos key={role} />}
      {activeView === "clientes" && <Customers key={role} role={role} />}
      {activeView === "productos" && <Products key={role} />}
      {activeView === "admins" && <Admins key={role} />}
    </div>
  );
}

export default App;
