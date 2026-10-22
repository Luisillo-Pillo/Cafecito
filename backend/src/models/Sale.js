const { Schema, model } = require("mongoose");
const { PAYMENT_METHODS } = require("../config/constants");

// Nombre y precio se copian al vender para que editar el producto no altere ventas pasadas
const saleItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productNameSnapshot: { type: String, required: true },
    size: { type: String },
    unitPriceSnapshot: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    customerNameSnapshot: { type: String, default: null },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cash" },
    items: {
      type: [saleItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "La venta necesita al menos un producto",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    // Solo para ventas migradas desde la colección antigua `orders`
    legacyOrderId: { type: Schema.Types.ObjectId, default: undefined },
  },
  { timestamps: true }
);

saleSchema.index({ customerId: 1, createdAt: -1 });

module.exports = model("Sale", saleSchema);
