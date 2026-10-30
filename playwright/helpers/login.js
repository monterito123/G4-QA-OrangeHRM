// Login y logout reutilizables. Se entra siempre por la pantalla, como lo haría el usuario.
const { expect } = require('@playwright/test');
const ambiente = require('../ambiente');

async function iniciarSesion(page, usuario, clave) {
  await page.goto('/web/index.php/auth/login');
  await page.getByPlaceholder('Username').fill(usuario);
  await page.getByPlaceholder('Password').fill(clave);
  await page.getByRole('button', { name: 'Login' }).click();
  // Si el login funcionó, OrangeHRM manda siempre al Dashboard
  await expect(page).toHaveURL(/dashboard/);
}

async function iniciarSesionAdmin(page) {
  await iniciarSesion(page, ambiente.ADMIN_USER, ambiente.ADMIN_PASS);
}

async function cerrarSesion(page) {
  await page.goto('/web/index.php/auth/logout');
  await expect(page).toHaveURL(/auth\/login/);
}

module.exports = { iniciarSesion, iniciarSesionAdmin, cerrarSesion };
