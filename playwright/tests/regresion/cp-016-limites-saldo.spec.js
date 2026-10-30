// CP-016 (HU-10, HU-12): solicitar vacaciones en los límites del saldo (5 días). Pasos del Plan:
// 1. Solicitar 1 día. 2. Solicitar 5 días (saldo exacto). 3. Solicitar 6 días (saldo + 1).
// 4. Solicitar un rango con la fecha final anterior a la inicial. El Plan pide restablecer el saldo entre
// intentos: por eso cada intento es una prueba aparte con su propio ESS de 5 días.
// Confirmado en el Paso 0:
// - 1 día y el saldo exacto se aceptan ("Successfully Saved"). Un solo día se lista como "2026-11-10".
// - Saldo + 1: "Leave Balance" cambia a "Balance not sufficient"; al dar Apply sale "Leave Balance Exceeded"
//   y no se guarda.
// - Fecha final anterior a la inicial: "To date should be after from date" y Apply no hace nada.
const { test, expect } = require('@playwright/test');
const api = require('../../helpers/api');
const { iniciarSesion } = require('../../helpers/login');
const licencias = require('../../helpers/licencias');
const { capturar } = require('../../helpers/evidencia');

const SALDO = 5;

// Preparación común: un ESS con 5 días y N días hábiles reales para pedir
async function preparar(cantidadDias) {
  const admin = await api.nuevaApiAdmin();
  const formato = await api.formatoFecha(admin);
  const rango = await api.buscarDiasHabiles(admin, cantidadDias);
  const ess = await api.prepararEss(admin, { saldo: SALDO, periodo: rango.periodo });
  await admin.dispose();
  const fechas = rango.dias.map(function (dia) { return api.formatear(dia, formato); });
  return { ess: ess, fechas: fechas, periodo: rango.periodo };
}

// Las tres pruebas que se aceptan comparten los mismos pasos; solo cambia cuántos días se piden
const aceptadas = [
  { caso: 'CP-016-un-dia', nombre: '1 día (mínimo)', dias: 1, quedan: '4.00' },
  { caso: 'CP-016-saldo-exacto', nombre: '5 días (saldo exacto)', dias: 5, quedan: '0.00' }
];

for (const datos of aceptadas) {
  test('CP-016 (HU-10, HU-12) Pedir ' + datos.nombre + ' se acepta @regresion', async ({ page }, testInfo) => {
    let preparado;

    await test.step('Preparación: ESS con 5 días y ' + datos.dias + ' día(s) hábil(es) reales (por API)', async () => {
      preparado = await preparar(datos.dias);
    });
    const desde = preparado.fechas[0];
    const hasta = preparado.fechas[preparado.fechas.length - 1];

    await test.step('Paso 1: iniciar sesión y pedir ' + datos.nombre + ' en Leave > Apply', async () => {
      await iniciarSesion(page, preparado.ess.usuario, preparado.ess.clave);
      await licencias.abrirSolicitud(page, process.env.G4_TIPO_LICENCIA);
      await expect(licencias.saldoMostrado(page)).toContainText('5.00 Day(s)');
      await licencias.llenarFechas(page, desde, hasta);
      await capturar(page, testInfo, datos.caso, 1, 'solicitud de ' + datos.dias + ' dias con saldo 5');
    });

    await test.step('Paso 2: pulsar Apply: se acepta', async () => {
      await licencias.aplicar(page);
      await expect(page.getByText('Successfully Saved')).toBeVisible();
      await capturar(page, testInfo, datos.caso, 2, 'Successfully Saved');
    });

    await test.step('Paso 3: My Leave muestra la solicitud pendiente y el saldo restante', async () => {
      const fila = await licencias.filaEnMisLicencias(page, licencias.textoRango(desde, hasta));
      await expect(fila).toContainText('Pending Approval (' + datos.dias + '.00)');
      await expect(fila).toContainText(datos.quedan);
      await capturar(page, testInfo, datos.caso, 3, 'pendiente con saldo ' + datos.quedan);
    });
  });
}

test('CP-016 (HU-10, HU-12) Pedir 6 días (saldo + 1) muestra Leave Balance Exceeded y no se guarda @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-016-saldo-mas-uno';
  let preparado;

  await test.step('Preparación: ESS con 5 días y 6 días hábiles reales (por API)', async () => {
    preparado = await preparar(SALDO + 1);
  });
  const desde = preparado.fechas[0];
  const hasta = preparado.fechas[preparado.fechas.length - 1];

  await test.step('Paso 1: iniciar sesión y pedir 6 días: el saldo dice Balance not sufficient', async () => {
    await iniciarSesion(page, preparado.ess.usuario, preparado.ess.clave);
    await licencias.abrirSolicitud(page, process.env.G4_TIPO_LICENCIA);
    await licencias.llenarFechas(page, desde, hasta);
    await expect(licencias.saldoMostrado(page)).toContainText('Balance not sufficient');
    await capturar(page, testInfo, caso, 1, 'Balance not sufficient');
  });

  await test.step('Paso 2: pulsar Apply: sale Leave Balance Exceeded', async () => {
    await licencias.aplicar(page);
    await expect(page.getByText('Leave Balance Exceeded')).toBeVisible();
    await capturar(page, testInfo, caso, 2, 'Leave Balance Exceeded');
  });

  await test.step('Paso 3: My Leave no tiene ninguna solicitud', async () => {
    await page.goto('/web/index.php/leave/viewMyLeaveList');
    await expect(page.getByText('No Records Found').first()).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: licencias.textoRango(desde, hasta) })).toHaveCount(0);
    await capturar(page, testInfo, caso, 3, 'My Leave sin solicitudes');
  });

  await test.step('Paso 4: el saldo no cambió (sigue en 5 y no hay días pendientes)', async () => {
    // En el formulario de Apply el saldo sigue en 5.00
    await licencias.abrirSolicitud(page, process.env.G4_TIPO_LICENCIA);
    await expect(licencias.saldoMostrado(page)).toContainText('5.00 Day(s)');
    // Y en el reporte de saldo no quedó nada pendiente ni programado
    const saldo = await licencias.saldoEnReporte(page, process.env.G4_TIPO_LICENCIA, preparado.periodo);
    expect(saldo.entitlementDays).toBe('5.00');
    expect(saldo.pendingApprovalDays).toBe('0.00');
    expect(saldo.scheduledDays).toBe('0.00');
    expect(saldo.balanceDays).toBe('5.00');
    await capturar(page, testInfo, caso, 4, 'saldo sigue en 5');
  });
});

test('CP-016 (HU-10, HU-12) Rango con fecha final anterior a la inicial muestra To date should be after from date @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-016-rango-invertido';
  let preparado;

  await test.step('Preparación: ESS con 5 días y 2 días hábiles reales (por API)', async () => {
    preparado = await preparar(2);
  });
  // Se invierten las fechas: "desde" es el segundo día y "hasta" el primero
  const desde = preparado.fechas[1];
  const hasta = preparado.fechas[0];

  await test.step('Paso 1: iniciar sesión y escribir una fecha final anterior a la inicial', async () => {
    await iniciarSesion(page, preparado.ess.usuario, preparado.ess.clave);
    await licencias.abrirSolicitud(page, process.env.G4_TIPO_LICENCIA);
    await licencias.llenarFechas(page, desde, hasta);
    await expect(licencias.errorFechaFinal(page)).toHaveText('To date should be after from date');
    await capturar(page, testInfo, caso, 1, 'To date should be after from date');
  });

  await test.step('Paso 2: pulsar Apply: no se envía', async () => {
    await licencias.aplicar(page);
    await expect(licencias.errorFechaFinal(page)).toHaveText('To date should be after from date');
    await expect(page.getByText('Successfully Saved')).toHaveCount(0);
    await capturar(page, testInfo, caso, 2, 'Apply bloqueado');
  });

  await test.step('Paso 3: My Leave no tiene ninguna solicitud', async () => {
    await page.goto('/web/index.php/leave/viewMyLeaveList');
    await expect(page.getByText('No Records Found').first()).toBeVisible();
    await capturar(page, testInfo, caso, 3, 'My Leave sin solicitudes');
  });
});
