// CP-011 (HU-06): registrar empleado con datos inválidos. Pasos del Plan:
// 1. Ir a PIM > Add Employee. 2. Probar (a) nombre y apellido vacíos, (b) longitud máxima y un carácter más,
// (c) Employee Id repetido, (d) caracteres especiales en el nombre. 3. Intentar guardar en cada caso.
// Cada variante es una prueba aparte para que sean independientes.
// Confirmado en el Paso 0: "Required", "Should not exceed 30 characters" (con 30 no sale error) y
// "Employee Id already exists" (sale al salir del campo). Con caracteres especiales OrangeHRM NO muestra
// ningún mensaje y guarda el empleado; la variante (d) valida lo que dice el Plan y por eso falla.
const { test, expect } = require('@playwright/test');
const api = require('../../helpers/api');
const { iniciarSesionAdmin } = require('../../helpers/login');
const { capturar } = require('../../helpers/evidencia');

function campoEmployeeId(page) {
  return page.locator('.oxd-input-group', { hasText: 'Employee Id' }).locator('input');
}

async function abrirAddEmployee(page, testInfo, caso) {
  await iniciarSesionAdmin(page);
  await page.goto('/web/index.php/pim/addEmployee');
  await expect(page.getByRole('heading', { name: 'Add Employee' })).toBeVisible();
  await capturar(page, testInfo, caso, 1, 'formulario Add Employee');
}

test('CP-011 (HU-06) (a) Nombre y apellido vacíos muestran Required y no se guarda @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-011a-vacios';

  await test.step('Paso 1: ir a PIM > Add Employee', async () => {
    await abrirAddEmployee(page, testInfo, caso);
  });

  await test.step('Paso 2: dejar First Name y Last Name vacíos', async () => {
    await expect(page.getByPlaceholder('First Name')).toHaveValue('');
    await expect(page.getByPlaceholder('Last Name')).toHaveValue('');
  });

  await test.step('Paso 3: intentar guardar y validar Required', async () => {
    await page.getByRole('button', { name: 'Save' }).click();
    // Un "Required" por First Name y otro por Last Name (exact evita contar la leyenda "* Required")
    await expect(page.getByText('Required', { exact: true })).toHaveCount(2);
    await expect(page).toHaveURL(/pim\/addEmployee/);
    await capturar(page, testInfo, caso, 3, 'Required en nombre y apellido');
  });
});

test('CP-011 (HU-06) (b) Acepta 30 caracteres y rechaza 31 con Should not exceed 30 characters @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-011b-longitud';
  const apellido = process.env.G4_CORRIDA;
  // 30 caracteres es el máximo; 31 es uno más
  const nombre30 = 'G4-' + 'A'.repeat(27);
  const nombre31 = 'G4-' + 'A'.repeat(28);

  await test.step('Paso 1: ir a PIM > Add Employee', async () => {
    await abrirAddEmployee(page, testInfo, caso);
  });

  await test.step('Paso 2: escribir un nombre de 30 caracteres (máximo): no sale error', async () => {
    await page.getByPlaceholder('First Name').fill(nombre30);
    await page.getByPlaceholder('Last Name').fill(apellido);
    await expect(page.getByText('Should not exceed 30 characters')).toHaveCount(0);
    await capturar(page, testInfo, caso, 2, 'nombre de 30 caracteres sin error');
  });

  await test.step('Paso 3: escribir 31 caracteres e intentar guardar: se rechaza', async () => {
    await page.getByPlaceholder('First Name').fill(nombre31);
    await expect(page.getByText('Should not exceed 30 characters')).toBeVisible();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Should not exceed 30 characters')).toBeVisible();
    await expect(page).toHaveURL(/pim\/addEmployee/);
    await capturar(page, testInfo, caso, 3, 'Should not exceed 30 characters');
  });

  await test.step('Paso 4: volver a 30 caracteres y guardar: se acepta', async () => {
    await page.getByPlaceholder('First Name').fill(nombre30);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await expect(page).toHaveURL(/pim\/viewPersonalDetails/);
    await capturar(page, testInfo, caso, 4, 'nombre de 30 caracteres guardado');
  });
});

test('CP-011 (HU-06) (c) Employee Id repetido muestra Employee Id already exists y no se guarda @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-011c-id-repetido';
  const idRepetido = api.idUnico();
  const admin = await api.nuevaApiAdmin();

  await test.step('Preparación: crear por API un empleado que ya tiene ese Employee Id', async () => {
    await api.crearEmpleado(admin, 'G4-Existente', process.env.G4_CORRIDA, idRepetido);
  });

  await test.step('Paso 1: ir a PIM > Add Employee', async () => {
    await abrirAddEmployee(page, testInfo, caso);
  });

  await test.step('Paso 2: escribir el Employee Id repetido', async () => {
    await page.getByPlaceholder('First Name').fill('G4-Duplicado');
    await page.getByPlaceholder('Last Name').fill(process.env.G4_CORRIDA);
    await campoEmployeeId(page).fill(idRepetido);
    // La validación del Id corre al salir del campo
    await page.getByPlaceholder('First Name').click();
    await expect(page.getByText('Employee Id already exists')).toBeVisible();
    await capturar(page, testInfo, caso, 2, 'Employee Id already exists');
  });

  await test.step('Paso 3: intentar guardar: no se guarda', async () => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Employee Id already exists')).toBeVisible();
    await expect(page).toHaveURL(/pim\/addEmployee/);
    // Sigue habiendo un solo empleado con ese Id
    expect(await api.contarEmpleadosPorId(admin, idRepetido)).toBe(1);
    await capturar(page, testInfo, caso, 3, 'no se guardo el duplicado');
  });
  await admin.dispose();
});

test('CP-011 (HU-06) (d) Nombre con caracteres no permitidos se rechaza con un mensaje de validación @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-011d-caracteres';
  // < y > son los caracteres que una validación de nombres normalmente no permite (pueden armar etiquetas HTML).
  // Pendiente (tarea G4QA-24): cuando el PO defina la lista de CA-06.4, se agregan aquí los casos positivos
  // que deben aceptarse, como Núñez, O'Connor y Rojas-Oviedo
  const nombreEspecial = 'G4-<Ana>';
  // Employee Id propio: el Id no es lo que se prueba aquí. Con el Id sugerido, en la demo compartida salió
  // "Employee Id already exists" y la prueba lo confundió con la validación del nombre (falso positivo del 29/10)
  const idEmpleado = api.idUnico();
  // Mensajes de validación SOLO de los campos de nombre (First, Middle y Last Name). Los tres van dentro de
  // un bloque ".--name-grouped-field" sin rol accesible; así no cuenta el error de otro campo, como el del Id
  const errorEnNombre = page.locator('.--name-grouped-field .oxd-input-field-error-message');

  await test.step('Paso 1: ir a PIM > Add Employee', async () => {
    await abrirAddEmployee(page, testInfo, caso);
  });

  await test.step('Paso 2: escribir un nombre con caracteres especiales', async () => {
    await page.getByPlaceholder('First Name').fill(nombreEspecial);
    await page.getByPlaceholder('Last Name').fill(process.env.G4_CORRIDA);
    await campoEmployeeId(page).fill(idEmpleado);
    await capturar(page, testInfo, caso, 2, 'nombre con caracteres especiales');
  });

  await test.step('Paso 3: intentar guardar: según el Plan debe salir un mensaje de validación en el nombre y no guardarse', async () => {
    await page.getByRole('button', { name: 'Save' }).click();
    // Resultado esperado del Plan (HU-06, CA-06.4): mensaje de validación en el campo del nombre.
    // Si OrangeHRM guarda el empleado, este expect falla y la captura de la falla muestra Personal Details
    // (defecto G4QA-23)
    await expect(errorEnNombre.first()).toBeVisible();
    await expect(page).toHaveURL(/pim\/addEmployee/);
    const admin = await api.nuevaApiAdmin();
    expect(await api.contarEmpleadosPorId(admin, idEmpleado)).toBe(0);
    await admin.dispose();
    await capturar(page, testInfo, caso, 3, 'mensaje de validacion en el nombre');
  });
});
