// Toma la captura al final de cada paso y la adjunta al reporte HTML, junto al paso.
// En la corrida final (EVIDENCIA=1) además la copia a evidencias/fase4/corridas/<AAAA-MM-DD_HHmm>/<ambiente>/<navegador>/
// con un nombre que dice qué es, por ejemplo CP-016-saldo-mas-uno_paso-03_leave-balance-exceeded.png
// Cada corrida queda en su propia carpeta: nunca se borra ni se pisa la evidencia de una corrida anterior
const fs = require('fs');
const path = require('path');
const ambiente = require('../ambiente');

const CORRIDA_FINAL = process.env.EVIDENCIA === '1';

// "Leave Balance Exceeded" -> "leave-balance-exceeded" (sin tildes ni espacios, para que sirva como nombre de archivo)
function aNombreDeArchivo(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function capturar(page, testInfo, caso, numeroPaso, descripcion) {
  const archivo = caso + '_paso-' + String(numeroPaso).padStart(2, '0') + '_' + aNombreDeArchivo(descripcion) + '.png';
  const ruta = testInfo.outputPath(archivo);
  await page.screenshot({ path: ruta });

  // El nombre del adjunto es el que se ve en el reporte debajo del paso
  await testInfo.attach('Paso ' + numeroPaso + ': ' + descripcion, { path: ruta, contentType: 'image/png' });

  if (CORRIDA_FINAL) {
    // fase4_playwright.ps1 define G4_CARPETA_EVIDENCIA con la carpeta de la corrida y el ambiente.
    // Si se corre Playwright sin el script, se usa la marca de la corrida (C + MMDDHHmmss) como nombre
    let carpetaCorrida = process.env.G4_CARPETA_EVIDENCIA;
    if (!carpetaCorrida) {
      carpetaCorrida = path.join(__dirname, '..', '..', 'evidencias', 'fase4', 'corridas', process.env.G4_CORRIDA, ambiente.target);
    }
    const carpeta = path.join(carpetaCorrida, testInfo.project.name);
    fs.mkdirSync(carpeta, { recursive: true });
    fs.copyFileSync(ruta, path.join(carpeta, archivo));
  }
}

module.exports = { capturar };
