import { useState } from "react";
import Pos from "./pages/Pos";
import Customers from "./pages/Customers";
import logo from "./assets/products/americano.svg";

function App() {
  const [view, setView] = useState("pos");

  return (
    <div className="pos">
      <header className="pos-header">
        <h1>
          <img src={logo} alt="Cafecito" className="pos-logo" />
          Cafecito
        </h1>
        <nav className="pos-nav">
          <button
            className={view === "pos" ? "is-active" : ""}
            onClick={() => setView("pos")}
          >
            Punto de venta
          </button>
          <button
            className={view === "clientes" ? "is-active" : ""}
            onClick={() => setView("clientes")}
          >
            Clientes
          </button>
        </nav>
      </header>

      {view === "pos" ? <Pos /> : <Customers />}
    </div>
  );
}

export default App;
