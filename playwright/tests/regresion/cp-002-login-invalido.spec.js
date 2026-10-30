// CP-002 (HU-01): inicio de sesión con datos inválidos. Pasos del Plan:
// 1. Abrir la pantalla de login. 2. Probar las combinaciones (a), (b) y (c). 3. Pulsar Login en cada una.
// Textos confirmados en el Paso 0: "Invalid credentials" (aviso con rol alert) y "Required" debajo de cada campo.
const { test, expect } = require('@playwright/test');
const ambiente = require('../../ambiente');
const { capturar } = require('../../helpers/evidencia');

// Datos parametrizados: las combinaciones (a) y (b) del Plan deben dar el mismo mensaje
const combinaciones = [
  { caso: 'CP-002a-clave-incorrecta', nombre: '(a) contraseña incorrecta', usuario: ambiente.ADMIN_USER, clave: 'ClaveIncorrecta-G4' },
  { caso: 'CP-002b-usuario-inexistente', nombre: '(b) usuario que no existe', usuario: 'g4-no-existe', clave: 'ClaveIncorrecta-G4' }
];

for (const datos of combinaciones) {
  test('CP-002 (HU-01) Login con ' + datos.nombre + ' muestra Invalid credentials @regresion', async ({ page }, testInfo) => {
    await test.step('Paso 1: abrir la pantalla de login', async () => {
      await page.goto('/web/index.php/auth/login');
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      await capturar(page, testInfo, datos.caso, 1, 'pantalla de login');
    });

    await test.step('Paso 2: ingresar ' + datos.nombre, async () => {
      await page.getByPlaceholder('Username').fill(datos.usuario);
      await page.getByPlaceholder('Password').fill(datos.clave);
      await capturar(page, testInfo, datos.caso, 2, 'credenciales invalidas ingresadas');
    });

    await test.step('Paso 3: pulsar Login y validar Invalid credentials', async () => {
      await page.getByRole('button', { name: 'Login' }).click();
      // El mensaje sale en un aviso de error y el usuario se queda en la página de login
      await expect(page.getByRole('alert')).toContainText('Invalid credentials');
      await expect(page).toHaveURL(/auth\/login/);
      await capturar(page, testInfo, datos.caso, 3, 'Invalid credentials');
    });
  });
}

test('CP-002 (HU-01) Login con (c) campos vacíos muestra Required en ambos campos @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-002c-campos-vacios';

  await test.step('Paso 1: abrir la pantalla de login', async () => {
    await page.goto('/web/index.php/auth/login');
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await capturar(page, testInfo, caso, 1, 'pantalla de login');
  });

  await test.step('Paso 2: dejar Username y Password vacíos', async () => {
    await expect(page.getByPlaceholder('Username')).toHaveValue('');
    await expect(page.getByPlaceholder('Password')).toHaveValue('');
  });

  await test.step('Paso 3: pulsar Login y validar Required en cada campo', async () => {
    await page.getByRole('button', { name: 'Login' }).click();
    // exact: true para contar solo los mensajes "Required" y no otro texto que lo contenga
    await expect(page.getByText('Required', { exact: true })).toHaveCount(2);
    await expect(page).toHaveURL(/auth\/login/);
    await capturar(page, testInfo, caso, 3, 'Required en ambos campos');
  });
});
