const customerService = require("../services/customer.service");
const saleService = require("../services/sale.service");
const { calculateDiscount } = require("../services/discount.service");
const { parsePagination, paginated } = require("../utils/validation");

// Agrega el % de descuento que tendría su PRÓXIMA compra (solo informativo)
const withDiscount = (customer) => ({
  ...customer.toJSON(),
  nextDiscountPercent: calculateDiscount(customer.purchasesCount),
});

// GET /api/customers?q=&page=&limit=
async function list(req, res) {
  const pagination = parsePagination(req.query);
  const { data, total, search } = await customerService.listCustomers({
    q: req.query.q,
    ...pagination,
  });
  res.json(
    paginated(
      data.map(withDiscount),
      total,
      pagination,
      search && `No se encontraron clientes para "${search}"`
    )
  );
}

// GET /api/customers/:id
async function getById(req, res) {
  res.json(withDiscount(await customerService.getCustomer(req.params.id)));
}

// GET /api/customers/:id/sales - historial de compras, más reciente primero
async function listSales(req, res) {
  const pagination = parsePagination(req.query);
  const customer = await customerService.getCustomer(req.params.id);
  const { data, total } = await saleService.listSales({
    customerId: customer.id,
    ...pagination,
  });
  res.json(paginated(data, total, pagination));
}

// POST /api/customers
async function create(req, res) {
  const customer = await customerService.createCustomer(req.body);
  res.status(201).json(withDiscount(customer));
}

// PUT /api/customers/:id
async function update(req, res) {
  res.json(withDiscount(await customerService.updateCustomer(req.params.id, req.body)));
}

// DELETE /api/customers/:id
async function remove(req, res) {
  const customer = await customerService.deleteCustomer(req.params.id);
  res.json({ message: "Cliente eliminado correctamente", id: customer.id });
}

module.exports = { list, getById, listSales, create, update, remove };
