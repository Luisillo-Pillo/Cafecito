/**
 * Opciones de serialización compartidas por los modelos: la API expone `id`
 * (string) en vez de `_id`, y oculta `__v`, como pide el contrato de API.
 */
const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
};

module.exports = { toJSONOptions };
