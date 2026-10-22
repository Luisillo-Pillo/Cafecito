const STORE_NAME = "Cafecito Feliz";

const ROLES = Object.freeze({
  ADMIN: "admin",
  VENDEDOR: "vendedor",
});

const PAYMENT_METHODS = Object.freeze(["cash", "card", "transfer"]);

const PRODUCT_CATEGORIES = Object.freeze(["bebida", "postre", "snack", "otro"]);

const DRINK_SIZES_COUNT = 3;

module.exports = { STORE_NAME, ROLES, PAYMENT_METHODS, PRODUCT_CATEGORIES, DRINK_SIZES_COUNT };
