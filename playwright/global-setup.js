// Corre una sola vez antes de todas las pruebas.
// 1. Inicia sesión como Admin por HTTP y guarda la sesión para que los helpers usen la API.
// 2. Deja definido el período de licencias (una instalación nueva no lo trae y Leave no funciona sin él).
// 3. Crea un tipo de licencia propio de la corrida, para no depender de los tipos que tenga cada ambiente.
const fs = require('fs');
const path = require('path');
const { request } = require('@playwright/test');
const ambiente = require('./ambiente');
const api = require('./helpers/api');

module.exports = async function () {
  const corrida = api.marcaDeCorrida();
  // Lo que se guarda en process.env aquí llega a todas las pruebas y al global-teardown
  process.env.G4_CORRIDA = corrida;
  fs.mkdirSync(path.join(__dirname, 'auth'), { recursive: true });

  // Login igual que en el script de JMeter: se lee el token CSRF de la página de login y se envía el formulario
  const contexto = await request.newContext({ baseURL: ambiente.BASE_URL });
  const paginaLogin = await contexto.get('/web/index.php/auth/login');
  const html = await paginaLogin.text();
  const encontrado = html.match(/:token="&quot;(.+?)&quot;"/);
  if (!encontrado) {
    throw new Error('No se encontró el token CSRF en ' + ambiente.BASE_URL + '. ¿Está arriba OrangeHRM?');
  }
  const respuesta = await contexto.post('/web/index.php/auth/validate', {
    form: { _token: encontrado[1], username: ambiente.ADMIN_USER, password: ambiente.ADMIN_PASS }
  });
  if (!respuesta.url().includes('dashboard')) {
    throw new Error('No se pudo iniciar sesión como Admin en ' + ambiente.BASE_URL + '. Revisar el usuario y la clave en .env');
  }
  await contexto.storageState({ path: api.SESION_ADMIN });

  const periodo = await contexto.get('/web/index.php/api/v2/leave/leave-period');
  let definido = false;
  if (periodo.ok()) {
    const json = await periodo.json();
    definido = json.meta.leavePeriodDefined === true;
  }
  if (!definido) {
    await api.llamar(contexto, 'PUT', 'leave/leave-period', { startMonth: 1, startDay: 1 });
    console.log('Se definió el período de licencias (1 de enero a 31 de diciembre)');
  }

  const tipo = await api.crearTipoLicencia(contexto, 'G4-Vacaciones ' + corrida);
  process.env.G4_TIPO_LICENCIA_ID = String(tipo.id);
  process.env.G4_TIPO_LICENCIA = tipo.name;

  console.log('Ambiente: ' + ambiente.target + ' (' + ambiente.BASE_URL + ') | corrida ' + corrida + ' | tipo de licencia "' + tipo.name + '"');
  await contexto.dispose();
};
