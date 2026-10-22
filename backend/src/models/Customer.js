const { Schema, model } = require("mongoose");
const { toJSONOptions } = require("../utils/toJSON");

// purchasesCount solo lo incrementa POST /api/sales; la API lo ignora en POST/PUT de clientes
const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    phoneOrEmail: { type: String, required: true, trim: true, unique: true },
    purchasesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

module.exports = model("Customer", customerSchema);
