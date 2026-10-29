const Admin = require("../models/Admin");
const { HttpError, validationError } = require("../utils/httpError");
const { isValidEmail } = require("../utils/validation");
const { hashPassword } = require("./auth.service");

const MIN_PASSWORD_LENGTH = 8;

const ownerEmail = () => process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;

function validateAdminData(body = {}) {
  const details = [];
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const { password } = body;

  if (!name) details.push({ field: "name", message: "Escribe el nombre." });
  else if (name.length < 2 || name.length > 100) {
    details.push({ field: "name", message: "El nombre debe tener entre 2 y 100 caracteres." });
  }

  if (!email) details.push({ field: "email", message: "Escribe el correo." });
  else if (!isValidEmail(email)) {
    details.push({ field: "email", message: "Escribe un correo válido (ej. nombre@correo.com)." });
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    details.push({
      field: "password",
      message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    });
  }

  return { details, data: { name, email, password } };
}

async function listAdmins() {
  const admins = await Admin.find().sort({ name: 1 });
  return { owner: ownerEmail(), data: admins };
}

async function createAdmin(body, createdBy) {
  const { details, data } = validateAdminData(body);
  if (details.length > 0) throw validationError(details);

  if (data.email === ownerEmail() || (await Admin.exists({ email: data.email }))) {
    throw new HttpError(400, "El administrador ya existe", {
      details: [{ field: "email", message: "Ya hay un administrador con ese correo." }],
    });
  }

  return Admin.create({
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    createdBy: createdBy ?? null,
  });
}

module.exports = { listAdmins, createAdmin };
