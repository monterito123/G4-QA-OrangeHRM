// CP-017 (HU-11, HU-12): aprobar una solicitud y verificar el descuento del saldo. Pasos del Plan:
// 1. Ir a Leave > Leave List filtrada por Pending Approval. 2. Pulsar Approve. 3. Revisar el estado.
// 4. Consultar el saldo del empleado (reporte de Leave).
// Aprueba el supervisor asignado en Report-to (no el Admin), y la prueba crea su propia solicitud:
// no depende de la de CP-015.
// Confirmado en el Paso 0: Leave List del supervisor muestra por defecto las pendientes con Approve/Reject;
// al aprobar sale "Successfully Updated"; el ESS ve "Scheduled (2.00)"; el reporte
// "My Leave Entitlements and Usage Report" muestra asignado, pendiente, programado, tomado y saldo.
const { test, expect } = require('@playwright/test');
const api = require('../../helpers/api');
const { iniciarSesion, cerrarSesion } = require('../../helpers/login');
const licencias = require('../../helpers/licencias');
const { capturar } = require('../../helpers/evidencia');

test('CP-017 (HU-11, HU-12) El supervisor aprueba: queda Scheduled y el saldo baja exactamente 2 días @regresion', async ({ page }, testInfo) => {
  // Tres logins seguidos (ESS, supervisor, ESS): se da más tiempo que al resto
  test.setTimeout(150000);
  const caso = 'CP-017';
  const tipo = process.env.G4_TIPO_LICENCIA;
  let ess;
  let rango;
  let desde;
  let hasta;

  await test.step('Preparación: ESS con 5 días y su supervisor en Report-to (por API)', async () => {
    const admin = await api.nuevaApiAdmin();
    const formato = await api.formatoFecha(admin);
    rango = await api.buscarDiasHabiles(admin, 2);
    ess = await api.prepararEss(admin, { saldo: 5, periodo: rango.periodo, conSupervisor: true });
    await admin.dispose();
    desde = api.formatear(rango.desde, formato);
    hasta = api.formatear(rango.hasta, formato);
  });
  const textoRango = licencias.textoRango(desde, hasta);

  await test.step('Paso 0 (prerrequisito): el ESS pide 2 días y la solicitud queda Pending Approval', async () => {
    await iniciarSesion(page, ess.usuario, ess.clave);
    await licencias.abrirSolicitud(page, tipo);
    await licencias.llenarFechas(page, desde, hasta);
    await licencias.aplicar(page);
    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await capturar(page, testInfo, caso, 0, 'solicitud de 2 dias enviada');
    await cerrarSesion(page);
  });

  const filaSupervisor = page.getByRole('row').filter({ hasText: textoRango });

  await test.step('Paso 1: el supervisor abre Leave List filtrada por Pending Approval', async () => {
    await iniciarSesion(page, ess.supervisor.usuario, ess.supervisor.clave);
    await page.goto('/web/index.php/leave/viewLeaveList');
    // El filtro de estado ya viene con "Pending Approval". El filtro elegido se muestra como una "ficha"
    // (.oxd-chip) que no tiene rol accesible, por eso se ubica por su clase (confirmada en el Paso 0)
    await expect(page.locator('.oxd-chip', { hasText: 'Pending Approval' })).toBeVisible();
    await expect(filaSupervisor).toContainText('Pending Approval (2.00)');
    await capturar(page, testInfo, caso, 1, 'Leave List con la solicitud pendiente');
  });

  await test.step('Paso 2: pulsar Approve', async () => {
    await filaSupervisor.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Successfully Updated')).toBeVisible();
    await capturar(page, testInfo, caso, 2, 'Successfully Updated');
    await cerrarSesion(page);
  });

  await test.step('Paso 3: revisar el estado: Scheduled', async () => {
    await iniciarSesion(page, ess.usuario, ess.clave);
    const fila = await licencias.filaEnMisLicencias(page, textoRango);
    await expect(fila).toContainText('Scheduled (2.00)');
    await capturar(page, testInfo, caso, 3, 'Scheduled 2 dias');
  });

  await test.step('Paso 4: consultar el saldo en el reporte: baja exactamente 2 días (de 5 a 3)', async () => {
    await page.goto('/web/index.php/leave/viewMyLeaveBalanceReport');
    await expect(page.getByText(tipo).first()).toBeVisible();
    const saldo = await licencias.saldoEnReporte(page, tipo, rango.periodo);
    expect(saldo.entitlementDays).toBe('5.00');
    expect(saldo.pendingApprovalDays).toBe('0.00');
    expect(saldo.scheduledDays).toBe('2.00');
    expect(saldo.balanceDays).toBe('3.00');
    await capturar(page, testInfo, caso, 4, 'reporte con saldo 3 y 2 programados');
  });
});
