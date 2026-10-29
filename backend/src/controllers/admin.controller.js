const adminService = require("../services/admin.service");

async function list(_req, res) {
  res.json(await adminService.listAdmins());
}

async function create(req, res) {
  res.status(201).json(await adminService.createAdmin(req.body, req.userEmail));
}

module.exports = { list, create };
