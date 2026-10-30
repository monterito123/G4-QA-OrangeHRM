// Abre el reporte HTML de Playwright y guarda una captura de pantalla completa como evidencia.
// Uso: node tools/capturar_reporte_playwright.js <carpeta del reporte> <archivo .png>
const { chromium } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  const reporte = process.argv[2];
  const salida = process.argv[3];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto(pathToFileURL(path.join(reporte, 'index.html')).href);
  // El reporte arma la lista con JavaScript; se espera a que aparezca la primera prueba
  await page.getByText('CP-0').first().waitFor();
  await page.screenshot({ path: salida, fullPage: true });
  console.log('Captura guardada: ' + salida);
  await browser.close();
}

main();
