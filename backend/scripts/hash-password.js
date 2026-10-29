// Genera el valor de ADMIN_PASSWORD_HASH para backend/.env:
//   npm run hash-password --workspace=backend -- "<contraseña>"
const { hashPassword } = require("../src/services/auth.service");

const password = process.argv[2];
if (!password) {
  console.error('Uso: npm run hash-password --workspace=backend -- "<contraseña>"');
  process.exit(1);
}

hashPassword(password).then((hash) => console.log(hash));
