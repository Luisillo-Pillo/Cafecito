const Customer = require("../models/Customer");
const { HttpError, validationError, notFound } = require("../utils/httpError");
const { isValidId, escapeRegex, normalizePhoneOrEmail } = require("../utils/validation");

function validateCustomerData(body = {}, { partial = false } = {}) {
  const details = [];
  const data = {};

  if (!partial || body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      details.push({ field: "name", message: "name es requerido" });
    } else if (name.length < 2 || name.length > 100) {
      details.push({ field: "name", message: "name debe tener entre 2 y 100 caracteres" });
    } else {
      data.name = name;
    }
  }

  if (!partial || body.phoneOrEmail !== undefined) {
    if (typeof body.phoneOrEmail !== "string" || body.phoneOrEmail.trim() === "") {
      details.push({ field: "phoneOrEmail", message: "phoneOrEmail es requerido" });
    } else {
      const normalized = normalizePhoneOrEmail(body.phoneOrEmail);
      if (!normalized) {
        details.push({
          field: "phoneOrEmail",
          message: "Debe ser un correo válido (usuario@ejemplo.com) o un teléfono con + (+524491234567)",
        });
      } else {
        data.phoneOrEmail = normalized;
      }
    }
  }

  return { details, data };
}

// Decisión del equipo (edge case del Kit): un cliente duplicado se rechaza con 400 e indica cuál existe
async function assertNotDuplicated(phoneOrEmail, exceptId) {
  const existing = await Customer.findOne({ phoneOrEmail });
  if (existing && String(existing._id) !== String(exceptId)) {
    throw new HttpError(400, "El cliente ya existe", {
      details: [
        {
          field: "phoneOrEmail",
          message: "Ya existe un cliente con ese correo o teléfono",
          existingCustomerId: existing.id,
        },
      ],
    });
  }
}

async function listCustomers({ q, skip, limit }) {
  const search = typeof q === "string" ? q.trim() : "";
  const filter = search
    ? {
        $or: [
          { name: new RegExp(escapeRegex(search), "i") },
          { phoneOrEmail: new RegExp(escapeRegex(search), "i") },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    Customer.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);
  return { data, total, search };
}

async function getCustomer(id) {
  const customer = isValidId(id) ? await Customer.findById(id) : null;
  if (!customer) throw notFound("Cliente no encontrado", id);
  return customer;
}

async function createCustomer(body) {
  const { details, data } = validateCustomerData(body);
  if (details.length > 0) throw validationError(details);

  await assertNotDuplicated(data.phoneOrEmail);
  return Customer.create({ ...data, purchasesCount: 0 });
}

async function updateCustomer(id, body) {
  const customer = await getCustomer(id);
  const { details, data } = validateCustomerData(body, { partial: true });
  if (details.length > 0) throw validationError(details);

  if (data.phoneOrEmail) await assertNotDuplicated(data.phoneOrEmail, customer._id);
  customer.set(data);
  await customer.save();
  return customer;
}

async function deleteCustomer(id) {
  const customer = await getCustomer(id);
  await customer.deleteOne();
  return customer;
}

module.exports = { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
