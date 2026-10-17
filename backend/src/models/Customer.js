const { Schema, model } = require("mongoose");
const { toJSONOptions } = require("../utils/toJSON");

/**
 * Cliente. Según el Kit, se identifica con un solo campo `phoneOrEmail`
 * (correo o teléfono con +) y lleva `purchasesCount`, que define su descuento.
 *
 * purchasesCount SOLO lo incrementa el backend al registrar una venta
 * (POST /api/sales); la API ignora ese campo en POST/PUT de clientes.
 */
const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    phoneOrEmail: { type: String, required: true, trim: true, unique: true },
    purchasesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

module.exports = model("Customer", customerSchema);
