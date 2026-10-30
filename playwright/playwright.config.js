const { defineConfig, devices } = require('@playwright/test');
const ambiente = require('./ambiente');

// EVIDENCIA=1 es la corrida final: se guarda trace y video de TODAS las pruebas.
// Sin la variable (mientras se desarrolla) solo se guardan cuando una prueba falla, para no llenar el disco.
const corridaFinal = process.env.EVIDENCIA === '1';
const modoGrabacion = corridaFinal ? 'on' : 'retain-on-failure';

module.exports = defineConfig({
  testDir: './tests',
  // Cada prueba tiene hasta 90 s; las de vacaciones hacen varios logins y la demo a veces va lenta
  timeout: 90000,
  expect: { timeout: 15000 },
  retries: 1,
  // Dos pruebas a la vez: suficiente para no saturar el contenedor local ni la demo compartida
  workers: 2,
  // Los resultados se separan por ambiente para no pisar el reporte de local con el de la demo
  outputDir: 'test-results/' + ambiente.target,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/' + ambiente.target }],
    ['json', { outputFile: 'resultados/' + ambiente.target + '.json' }]
  ],
  // Antes de todo: login de Admin y datos base. Al final: se borra lo que creó la corrida
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  use: {
    baseURL: ambiente.BASE_URL,
    screenshot: 'on',
    trace: modoGrabacion,
    video: modoGrabacion
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } }
  ]
});
