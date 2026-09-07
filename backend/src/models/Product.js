const { Schema, model } = require("mongoose");

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ["bebida", "postre", "snack", "otro"],
      default: "bebida",
    },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model("Product", productSchema);
