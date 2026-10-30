const { test, expect } = require('@playwright/test');
const ambiente = require('../ambiente');

test('CP-001 Inicio de sesion con credenciales validas', async ({ page }) => {
  await page.goto('/web/index.php/auth/login');
  await page.getByPlaceholder('Username').fill(ambiente.ADMIN_USER);
  await page.getByPlaceholder('Password').fill(ambiente.ADMIN_PASS);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
