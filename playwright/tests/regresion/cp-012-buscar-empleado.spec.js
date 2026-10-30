// CP-012 (HU-07): buscar empleado. Pasos del Plan:
// 1. Ir a PIM > Employee List. 2. Buscar por nombre, luego por Employee Id y luego por un nombre inexistente.
// 3. Pulsar Reset después de cada búsqueda.
// Confirmado en el Paso 0: "(1) Record Found" cuando lo encuentra, "No Records Found" cuando no, y Reset
// deja los filtros vacíos. Buscar con el nombre escrito (sin elegir la sugerencia) también funciona.
const { test, expect } = require('@playwright/test');
const api = require('../../helpers/api');
const { iniciarSesionAdmin } = require('../../helpers/login');
const { capturar } = require('../../helpers/evidencia');

// Las etiquetas de los filtros no están asociadas a sus campos: se ubican por el grupo que las contiene
function filtro(page, etiqueta) {
  return page.locator('.oxd-input-group', { hasText: etiqueta }).locator('input');
}

async function buscar(page) {
  await page.getByRole('button', { name: 'Search' }).click();
}

async function resetear(page) {
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(filtro(page, 'Employee Name')).toHaveValue('');
  await expect(filtro(page, 'Employee Id')).toHaveValue('');
}

test('CP-012 (HU-07) Buscar por nombre y por Id encuentra al empleado; un nombre inexistente da No Records Found @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-012';
  // Nombre único: si fuera "G4-Ana" chocaría con los empleados que otras pruebas crean al mismo tiempo
  const idEmpleado = api.idUnico();
  const nombre = 'G4-B' + idEmpleado.slice(2);

  await test.step('Preparación: crear por API el empleado que se va a buscar', async () => {
    const admin = await api.nuevaApiAdmin();
    await api.crearEmpleado(admin, nombre, process.env.G4_CORRIDA, idEmpleado);
    await admin.dispose();
  });

  await test.step('Paso 1: ir a PIM > Employee List', async () => {
    await iniciarSesionAdmin(page);
    await page.goto('/web/index.php/pim/viewEmployeeList');
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
    await capturar(page, testInfo, caso, 1, 'Employee List');
  });

  await test.step('Paso 2: buscar por nombre', async () => {
    await filtro(page, 'Employee Name').fill(nombre);
    await buscar(page);
    await expect(page.getByText('(1) Record Found')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: idEmpleado })).toContainText(nombre);
    await capturar(page, testInfo, caso, 2, 'encontrado por nombre');
  });

  await test.step('Paso 3: pulsar Reset', async () => {
    await resetear(page);
    await capturar(page, testInfo, caso, 3, 'filtros limpios tras buscar por nombre');
  });

  await test.step('Paso 4: buscar por Employee Id', async () => {
    await filtro(page, 'Employee Id').fill(idEmpleado);
    await buscar(page);
    await expect(page.getByText('(1) Record Found')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: idEmpleado })).toContainText(nombre);
    await capturar(page, testInfo, caso, 4, 'encontrado por Employee Id');
  });

  await test.step('Paso 5: pulsar Reset', async () => {
    await resetear(page);
    await capturar(page, testInfo, caso, 5, 'filtros limpios tras buscar por Id');
  });

  await test.step('Paso 6: buscar un nombre que no existe', async () => {
    await filtro(page, 'Employee Name').fill('G4-NoExiste' + idEmpleado.slice(2));
    await buscar(page);
    // "No Records Found" sale dos veces: en el encabezado de la tabla y en un aviso que desaparece solo.
    // Se revisa el primero y además que la tabla quede solo con la fila de títulos
    await expect(page.getByText('No Records Found').first()).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(1);
    await capturar(page, testInfo, caso, 6, 'No Records Found');
  });

  await test.step('Paso 7: pulsar Reset', async () => {
    await resetear(page);
    await capturar(page, testInfo, caso, 7, 'filtros limpios tras nombre inexistente');
  });
});
