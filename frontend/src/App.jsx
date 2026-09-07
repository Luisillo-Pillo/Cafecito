import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>☕ Cafecito</h1>
      <p>Frontend (React + Vite) conectado a la API en {API_URL}</p>

      {error && <p style={{ color: "crimson" }}>Error conectando con la API: {error}</p>}

      {health ? (
        <ul>
          <li>Estado API: {health.status}</li>
          <li>Estado MongoDB Atlas: {health.db}</li>
          <li>Timestamp: {health.timestamp}</li>
        </ul>
      ) : (
        !error && <p>Consultando estado de la API...</p>
      )}
    </main>
  );
}

export default App;
