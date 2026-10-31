// Frena ataques de fuerza bruta al login: tras MAX_FAILURES intentos fallidos para el mismo correo
// desde la misma IP, se bloquea por WINDOW_MS. En memoria: se reinicia junto con el servidor.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_TRACKED = 10_000;

const failures = new Map();

function pruneExpired(now) {
  for (const [key, entry] of failures) {
    if (entry.resetAt <= now) failures.delete(key);
  }
}

function loginLimiter(req, res, next) {
  const now = Date.now();
  if (failures.size > MAX_TRACKED) pruneExpired(now);

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const key = `${req.ip}|${email}`;
  const entry = failures.get(key);

  if (entry && entry.resetAt > now && entry.count >= MAX_FAILURES) {
    const minutes = Math.ceil((entry.resetAt - now) / 60_000);
    return res.status(429).json({
      error: "Demasiados intentos",
      details: [
        {
          field: "password",
          message: `Demasiados intentos fallidos. Espera ${minutes} min e intenta de nuevo.`,
        },
      ],
    });
  }

  res.on("finish", () => {
    if (res.statusCode === 401) {
      const current = failures.get(key);
      if (current && current.resetAt > Date.now()) current.count += 1;
      else failures.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
    } else if (res.statusCode === 200) {
      failures.delete(key);
    }
  });
  next();
}

module.exports = { loginLimiter };
