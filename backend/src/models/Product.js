const { Schema, model } = require("mongoose");

const sizeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["bebida", "postre", "snack", "otro"],
      default: "bebida",
    },
    // Las bebidas se venden por tamaño (Chico/Mediano/Grande); el resto usa un precio único.
    price: {
      type: Number,
      min: 0,
      required: function () {
        return this.category !== "bebida";
      },
    },
    sizes: {
      type: [sizeSchema],
      default: [],
      validate: {
        validator: function (sizes) {
          return this.category === "bebida" ? sizes.length === 3 : sizes.length === 0;
        },
        message: "Las bebidas deben tener exactamente 3 tamaños; los demás productos no usan tamaños.",
      },
    },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model("Product", productSchema);
