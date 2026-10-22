const { Schema, model } = require("mongoose");
const { PRODUCT_CATEGORIES, DRINK_SIZES_COUNT } = require("../config/constants");
const { toJSONOptions } = require("../utils/toJSON");

const sizeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0.01 },
  },
  { _id: false }
);

// Los 3 tamaños de una bebida comparten el mismo stock.
// Las validaciones con mensajes del contrato viven en product.service.js; estas son la red de seguridad.
const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "" },
    category: { type: String, enum: PRODUCT_CATEGORIES, default: "otro" },
    price: {
      type: Number,
      min: 0.01,
      required: function () {
        return this.category !== "bebida";
      },
    },
    sizes: {
      type: [sizeSchema],
      default: [],
      validate: {
        validator: function (sizes) {
          return this.category === "bebida"
            ? sizes.length === DRINK_SIZES_COUNT
            : sizes.length === 0;
        },
        message: "Las bebidas deben tener exactamente 3 tamaños; los demás productos no usan tamaños.",
      },
    },
    stock: { type: Number, required: true, min: 0, default: 0 },
    available: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

module.exports = model("Product", productSchema);
