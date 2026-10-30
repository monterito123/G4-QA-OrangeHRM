// CP-010 (HU-06): registrar un empleado con datos válidos. Pasos del Plan:
// 1. Ir a PIM > Add Employee. 2. Ingresar nombre y apellido; dejar el Employee Id generado. 3. Pulsar Save.
// Comportamiento confirmado en el Paso 0: aviso "Successfully Saved", se abre Personal Details con el
// Employee Id guardado, y en Employee List aparece "(1) Record Found" al buscarlo.
const { test, expect } = require('@playwright/test');
const api = require('../../helpers/api');
const { iniciarSesionAdmin } = require('../../helpers/login');
const { capturar } = require('../../helpers/evidencia');

// La etiqueta "Employee Id" no está asociada a su campo, así que se ubica por el grupo que la contiene
function campoEmployeeId(page) {
  return page.locator('.oxd-input-group', { hasText: 'Employee Id' }).locator('input');
}

test('CP-010 (HU-06) Agregar un empleado válido abre Personal Details y aparece en Employee List con Id único @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-010';
  const apellido = process.env.G4_CORRIDA;
  let idGenerado;

  await test.step('Paso 1: ir a PIM > Add Employee', async () => {
    await iniciarSesionAdmin(page);
    await page.goto('/web/index.php/pim/addEmployee');
    await expect(page.getByRole('heading', { name: 'Add Employee' })).toBeVisible();
    await capturar(page, testInfo, caso, 1, 'formulario Add Employee');
  });

  await test.step('Paso 2: ingresar First Name y Last Name y dejar el Employee Id generado', async () => {
    await page.getByPlaceholder('First Name').fill('G4-Ana');
    await page.getByPlaceholder('Last Name').fill(apellido);
    // OrangeHRM propone un Id; se guarda en una variable para compararlo después
    await expect(campoEmployeeId(page)).not.toHaveValue('');
    idGenerado = await campoEmployeeId(page).inputValue();
    await capturar(page, testInfo, caso, 2, 'datos ingresados con Id generado');
  });

  await test.step('Paso 3: pulsar Save y validar que se abre Personal Details', async () => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await expect(page).toHaveURL(/pim\/viewPersonalDetails\/empNumber\/\d+/);
    await expect(page.getByRole('heading', { name: 'Personal Details' })).toBeVisible();
    await expect(campoEmployeeId(page)).toHaveValue(idGenerado);
    await capturar(page, testInfo, caso, 3, 'Personal Details del nuevo empleado');
  });

  await test.step('Paso 4: buscarlo en Employee List y comprobar que el Id es único', async () => {
    await page.goto('/web/index.php/pim/viewEmployeeList');
    await campoEmployeeId(page).fill(idGenerado);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('(1) Record Found')).toBeVisible();
    const fila = page.getByRole('row').filter({ hasText: idGenerado });
    await expect(fila).toContainText('G4-Ana');
    await expect(fila).toContainText(apellido);
    // Además de la pantalla, la API confirma que hay un solo empleado con ese Id
    const admin = await api.nuevaApiAdmin();
    expect(await api.contarEmpleadosPorId(admin, idGenerado)).toBe(1);
    await admin.dispose();
    await capturar(page, testInfo, caso, 4, 'empleado en Employee List');
  });
});
