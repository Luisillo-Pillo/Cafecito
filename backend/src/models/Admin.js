const { Schema, model } = require("mongoose");
const { toJSONOptions } = require("../utils/toJSON");

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    createdBy: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      ...toJSONOptions,
      transform: (doc, ret) => {
        toJSONOptions.transform(doc, ret);
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

module.exports = model("Admin", adminSchema);
