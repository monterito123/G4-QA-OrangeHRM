const { chromium } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const paginas = [
  ['index.html', '01_resumen_apdex_y_estadisticas'],
  ['content/pages/OverTime.html', '02_tiempos_y_usuarios_activos'],
  ['content/pages/Throughput.html', '03_peticiones_por_segundo'],
  ['content/pages/ResponseTimes.html', '04_percentiles']
];

async function main() {
  const reporte = process.argv[2];
  const salida = process.argv[3];
  const prefijo = process.argv[4];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  for (const p of paginas) {
    await page.goto(pathToFileURL(path.join(reporte, p[0])).href);
    await page.waitForTimeout(3000);
    const archivo = path.join(salida, prefijo + '_' + p[1] + '.png');
    await page.screenshot({ path: archivo, fullPage: true });
    console.log('Captura guardada: ' + archivo);
  }
  await browser.close();
}

main();
