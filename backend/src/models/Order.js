const { Schema, model } = require("mongoose");

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    size: { type: String }, // solo presente cuando el producto es una bebida
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "La compra necesita al menos un producto",
      },
    },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = model("Order", orderSchema);
