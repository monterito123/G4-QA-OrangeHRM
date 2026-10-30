// Pasos de pantalla del módulo Leave que repiten CP-015, CP-016 y CP-017.
// OrangeHRM no asocia sus etiquetas con los campos (no hay <label for>), así que getByLabel no funciona.
// Por eso los campos se ubican por el grupo ".oxd-input-group" que contiene el texto de la etiqueta.
const { expect } = require('@playwright/test');

function grupo(page, etiqueta) {
  return page.locator('.oxd-input-group', { hasText: etiqueta });
}

// Abre Leave > Apply y elige el tipo de licencia. El selector es un componente propio (no un <select>):
// se abre con clic y las opciones tienen el rol "option"
async function abrirSolicitud(page, tipoLicencia) {
  await page.goto('/web/index.php/leave/applyLeave');
  await grupo(page, 'Leave Type').locator('.oxd-select-text').click();
  await page.getByRole('option', { name: tipoLicencia }).click();
}

// Texto que muestra "Leave Balance" a la derecha del formulario, por ejemplo "5.00 Day(s)"
function saldoMostrado(page) {
  return grupo(page, 'Leave Balance');
}

// Mensaje de validación debajo de "To Date" (por ejemplo, cuando la fecha final es anterior a la inicial)
function errorFechaFinal(page) {
  return grupo(page, 'To Date').locator('.oxd-input-field-error-message');
}

// Al salir de "From Date" OrangeHRM copia la misma fecha en "To Date"; por eso se llena primero
// From Date, se sale del campo y después se reemplaza To Date
async function llenarFechas(page, desde, hasta) {
  const titulo = page.getByRole('heading', { name: 'Apply Leave' });
  await grupo(page, 'From Date').locator('input').fill(desde);
  await titulo.click();
  await grupo(page, 'To Date').locator('input').fill(hasta);
  await titulo.click();
}

async function aplicar(page) {
  await page.getByRole('button', { name: 'Apply' }).click();
}

// Así muestra OrangeHRM el rango en las listas: un solo día aparece como "2026-11-10";
// varios días como "2026-11-05 to 2026-11-06" (confirmado en el Paso 0)
function textoRango(desde, hasta) {
  if (desde === hasta) {
    return desde;
  }
  return desde + ' to ' + hasta;
}

// Fila de My Leave que corresponde al rango pedido
async function filaEnMisLicencias(page, rango) {
  await page.goto('/web/index.php/leave/viewMyLeaveList');
  const fila = page.getByRole('row').filter({ hasText: rango });
  await expect(fila).toHaveCount(1);
  return fila;
}

// Datos del reporte "My Leave Entitlements and Usage Report" para un tipo de licencia.
// La tabla del reporte es un componente de cuadrícula sin roles de tabla (el nombre y los números van
// en bloques separados), así que los números se leen de la misma API que usa la pantalla para llenarla
async function saldoEnReporte(page, tipoLicencia, periodo) {
  const ruta = '/web/index.php/api/v2/leave/reports/data?limit=50&offset=0&name=my_leave_entitlements_and_usage'
    + '&fromDate=' + periodo.startDate + '&toDate=' + periodo.endDate;
  const respuesta = await page.request.get(ruta);
  expect(respuesta.status()).toBe(200);
  const json = await respuesta.json();
  for (const fila of json.data) {
    if (fila.leaveTypeName === tipoLicencia) {
      return fila;
    }
  }
  throw new Error('El reporte no tiene el tipo de licencia ' + tipoLicencia);
}

module.exports = { abrirSolicitud, saldoMostrado, errorFechaFinal, llenarFechas, aplicar, textoRango, filaEnMisLicencias, saldoEnReporte };
