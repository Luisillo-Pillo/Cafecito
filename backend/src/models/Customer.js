const { Schema, model } = require("mongoose");

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = model("Customer", customerSchema);
