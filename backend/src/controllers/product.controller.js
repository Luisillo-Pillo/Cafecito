const productService = require("../services/product.service");
const { parsePagination, paginated } = require("../utils/validation");

// GET /api/products?q=&page=&limit= (público)
async function list(req, res) {
  const pagination = parsePagination(req.query);
  const { data, total, search } = await productService.listProducts({
    q: req.query.q,
    ...pagination,
  });
  res.json(
    paginated(data, total, pagination, search && `No se encontraron productos para "${search}"`)
  );
}

// GET /api/products/:id (público)
async function getById(req, res) {
  res.json(await productService.getProduct(req.params.id));
}

// POST /api/products (solo admin)
async function create(req, res) {
  res.status(201).json(await productService.createProduct(req.body));
}

// PUT /api/products/:id (solo admin)
async function update(req, res) {
  res.json(await productService.updateProduct(req.params.id, req.body));
}

// DELETE /api/products/:id (solo admin)
async function remove(req, res) {
  const product = await productService.deleteProduct(req.params.id);
  res.json({ message: "Producto eliminado correctamente", id: product.id });
}

module.exports = { list, getById, create, update, remove };
