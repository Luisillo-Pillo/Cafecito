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

/**
 * Producto del catálogo. Campos mínimos del Kit: name, price, stock.
 * Extensión de Cafecito: las bebidas se venden por tamaño (sizes, con precio
 * propio cada uno) en vez de un precio único. El stock es por producto
 * (los 3 tamaños de una bebida comparten el mismo stock).
 *
 * Las validaciones de entrada con mensajes del contrato (422) viven en
 * services/product.service.js; las de aquí son la red de seguridad de la BD.
 */
const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
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
