import { test, expect } from "@playwright/test";
import { API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_TOKEN } from "../env.js";

const admin = { Authorization: `Bearer ${ADMIN_TOKEN}` };

async function addToCart(page, name) {
  await page.getByPlaceholder("Buscar producto por nombre...").fill(name);
  await page.locator("button.pos-card", { hasText: name }).click();
}

test("venta a un cliente VIP: aplica 15 % y muestra el ticket", async ({ page }) => {
  await page.goto("/");
  await addToCart(page, "Concha");

  await page.getByPlaceholder("Buscar por nombre, correo o teléfono").fill("Jorge");
  await page.getByRole("button", { name: /Jorge Ramírez/ }).click();
  await expect(page.getByText("Cliente VIP · 15%")).toBeVisible();
  await expect(page.getByText("Descuento 15%")).toBeVisible();

  await page.getByRole("button", { name: /^Cobrar/ }).click();
  const ticket = page.locator(".ticket");
  await expect(ticket).toContainText("Cafecito Feliz");
  await expect(ticket).toContainText("Jorge Ramírez");
  await expect(ticket).toContainText("15%");
});

test("si el stock se acaba antes de cobrar, la venta se rechaza completa", async ({ page, request }) => {
  await page.goto("/");
  await addToCart(page, "Brownie");

  const { data } = await (await request.get(`${API_URL}/products?q=Brownie`)).json();
  const brownie = data[0];
  const stockBefore = brownie.stock;
  await request.put(`${API_URL}/products/${brownie.id}`, { headers: admin, data: { stock: 0 } });

  await page.getByRole("button", { name: /^Cobrar/ }).click();
  await expect(page.getByRole("alert")).toContainText("Brownie");
  await expect(page.locator(".ticket")).toHaveCount(0);

  await request.put(`${API_URL}/products/${brownie.id}`, { headers: admin, data: { stock: stockBefore } });
});

test("el administrador entra con su contraseña y da de alta un producto que ya se puede vender", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Rol").selectOption("admin");

  const login = page.getByRole("dialog");
  await login.getByPlaceholder("Correo").fill(ADMIN_EMAIL);
  await login.getByPlaceholder("Contraseña").fill("contraseña-equivocada");
  await login.getByRole("button", { name: "Ingresar" }).click();
  await expect(login.getByRole("alert")).toContainText("incorrectos");

  await login.getByPlaceholder("Contraseña").fill(ADMIN_PASSWORD);
  await login.getByRole("button", { name: "Ingresar" }).click();
  await expect(login).toHaveCount(0);
  await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();

  await page.getByRole("button", { name: "Productos" }).click();
  await page.getByRole("button", { name: "+ Nuevo producto" }).click();
  await page.getByLabel("Nombre").fill("Galleta de avena");
  await page.getByLabel("Stock").fill("12");
  await page.getByLabel("Precio").fill("18");
  await page.getByRole("button", { name: "Crear producto" }).click();
  await expect(page.locator(".admin-product", { hasText: "Galleta de avena" })).toBeVisible();

  await page.getByRole("button", { name: "Punto de venta" }).click();
  await addToCart(page, "Galleta de avena");
  await expect(page.getByRole("button", { name: /^Cobrar \$18/ })).toBeVisible();
});
