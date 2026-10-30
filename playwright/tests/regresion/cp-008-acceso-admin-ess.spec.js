// CP-008 (HU-05): acceso a Admin por URL con un usuario ESS. Pasos del Plan:
// 1. Iniciar sesión con el ESS y confirmar que el menú no muestra Admin. 2. Pegar la URL de Admin > User Management.
// Comportamiento confirmado en el Paso 0: la URL no cambia, pero en vez de la tabla de usuarios aparece
// el aviso "Credential Required"; y la API de Admin responde 403 (Unauthorized). Lo de la API es un paso extra.
const { test, expect } = require('@playwright/test');
const api = require('../../helpers/api');
const { iniciarSesion } = require('../../helpers/login');
const { capturar } = require('../../helpers/evidencia');

test('CP-008 (HU-05) Un ESS que abre una URL de Admin recibe Credential Required y la API responde 403 @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-008';
  let ess;

  await test.step('Preparación: crear un ESS propio de esta prueba por API', async () => {
    const admin = await api.nuevaApiAdmin();
    ess = await api.prepararEss(admin, {});
    await admin.dispose();
  });

  await test.step('Paso 1: iniciar sesión con el ESS y confirmar que el menú no muestra Admin', async () => {
    await iniciarSesion(page, ess.usuario, ess.clave);
    // Los enlaces del menú no tienen nombre accesible, por eso se busca el enlace por su dirección
    await expect(page.locator('a[href*="/admin/viewAdminModule"]')).toHaveCount(0);
    await capturar(page, testInfo, caso, 1, 'menu del ESS sin Admin');
  });

  await test.step('Paso 2: pegar la URL de Admin > User Management', async () => {
    await page.goto('/web/index.php/admin/viewSystemUsers');
    await expect(page.getByRole('alert')).toContainText('Credential Required');
    await expect(page.getByRole('table')).toHaveCount(0);
    await capturar(page, testInfo, caso, 2, 'Credential Required');
  });

  await test.step('Paso 3 (extra): la API de Admin responde 403', async () => {
    // Se abre la API en el navegador con la sesión del ESS: así la respuesta queda visible en la captura
    const respuesta = await page.goto('/web/index.php/api/v2/admin/users');
    expect(respuesta.status()).toBe(403);
    await expect(page.getByText('Unauthorized')).toBeVisible();
    await capturar(page, testInfo, caso, 3, 'API admin users 403 Unauthorized');
  });
});
