const saleService = require("../services/sale.service");
const { parsePagination, paginated } = require("../utils/validation");

async function create(req, res) {
  res.status(201).json(await saleService.createSale(req.body));
}

async function list(req, res) {
  const pagination = parsePagination(req.query);
  const { data, total } = await saleService.listSales({
    customerId: req.query.customerId,
    ...pagination,
  });
  res.json(paginated(data, total, pagination));
}

async function getById(req, res) {
  res.json(await saleService.getSale(req.params.id));
}

module.exports = { create, list, getById };
