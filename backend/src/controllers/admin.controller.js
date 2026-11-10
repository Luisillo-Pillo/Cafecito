const adminService = require("../services/admin.service");

async function list(_req, res) {
  res.json(await adminService.listAdmins());
}

async function create(req, res) {
  res.status(201).json(await adminService.createAdmin(req.body, req.userEmail));
}

async function remove(req, res) {
  await adminService.deleteAdmin(req.params.id, req.userEmail);
  res.status(204).end();
}

module.exports = { list, create, remove };
