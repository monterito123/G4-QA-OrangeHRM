// CP-015 (HU-10, HU-12): solicitar vacaciones con saldo suficiente. Pasos del Plan:
// 1. Iniciar sesión con el ESS. 2. Ir a Leave > Apply, elegir el tipo con saldo y 2 días laborables.
// 3. Pulsar Apply. 4. Revisar Leave > My Leave.
// Prerrequisito del Plan: el Admin asignó 5 días de saldo (aquí se hace por API).
// Confirmado en el Paso 0: "Successfully Saved", la solicitud queda "Pending Approval (2.00)" y el saldo
// mostrado ya descuenta lo pendiente (de 5.00 pasa a 3.00 aunque todavía no esté aprobada).
const { test, expect } = require('@playwright/test');
const api = require('../../helpers/api');
const { iniciarSesion } = require('../../helpers/login');
const licencias = require('../../helpers/licencias');
const { capturar } = require('../../helpers/evidencia');

test('CP-015 (HU-10, HU-12) ESS con 5 días pide 2 días hábiles: queda Pending Approval y el saldo refleja 3 @regresion', async ({ page }, testInfo) => {
  const caso = 'CP-015';
  const tipo = process.env.G4_TIPO_LICENCIA;
  let ess;
  let desde;
  let hasta;

  await test.step('Preparación: ESS con 5 días de saldo y 2 días hábiles reales (por API)', async () => {
    const admin = await api.nuevaApiAdmin();
    const formato = await api.formatoFecha(admin);
    const rango = await api.buscarDiasHabiles(admin, 2);
    ess = await api.prepararEss(admin, { saldo: 5, periodo: rango.periodo });
    await admin.dispose();
    desde = api.formatear(rango.desde, formato);
    hasta = api.formatear(rango.hasta, formato);
  });

  await test.step('Paso 1: iniciar sesión con el ESS', async () => {
    await iniciarSesion(page, ess.usuario, ess.clave);
    await capturar(page, testInfo, caso, 1, 'sesion del ESS');
  });

  await test.step('Paso 2: Leave > Apply, tipo con saldo y rango de 2 días laborables', async () => {
    await licencias.abrirSolicitud(page, tipo);
    await expect(licencias.saldoMostrado(page)).toContainText('5.00 Day(s)');
    await licencias.llenarFechas(page, desde, hasta);
    await capturar(page, testInfo, caso, 2, 'solicitud de 2 dias con saldo 5');
  });

  await test.step('Paso 3: pulsar Apply', async () => {
    await licencias.aplicar(page);
    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await capturar(page, testInfo, caso, 3, 'Successfully Saved');
  });

  await test.step('Paso 4: revisar My Leave: Pending Approval por 2 días y saldo 3', async () => {
    const fila = await licencias.filaEnMisLicencias(page, licencias.textoRango(desde, hasta));
    await expect(fila).toContainText('Pending Approval (2.00)');
    await expect(fila).toContainText('3.00');
    await capturar(page, testInfo, caso, 4, 'Pending Approval 2 dias saldo 3');
  });
});
