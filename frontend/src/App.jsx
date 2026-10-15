import { useState } from "react";
import Pos from "./pages/Pos";
import Customers from "./pages/Customers";

function App() {
  const [view, setView] = useState("pos");

  return (
    <div className="pos">
      <header className="pos-header">
        <h1>☕ Cafecito</h1>
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
