import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { DB_URI } from "./env.js";

// Cada corrida empieza con el catálogo y los clientes del seed sobre una base vacía;
// por seguridad solo se borra una base cuyo nombre termine en _test
export default async function globalSetup() {
  const dbName = DB_URI.split("?")[0].split("/")[3] ?? "";
  if (!/_test$/.test(dbName)) {
    throw new Error(`La base "${dbName}" no termina en _test; por seguridad no se usa`);
  }

  await mongoose.connect(DB_URI);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  execFileSync(process.execPath, ["scripts/seed.js"], {
    cwd: fileURLToPath(new URL("../backend", import.meta.url)),
    env: { ...process.env, DB_CONNECTION_STRING: DB_URI },
    stdio: "inherit",
  });
}
