// Decide contra qué ambiente corren las pruebas: la instancia local (Docker) o la demo pública.
// Los datos salen del archivo .env (que no se sube a GitHub) o de variables de entorno.
// Para cambiar de ambiente no se toca código: solo la variable TARGET (local o demo).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const target = (process.env.TARGET || 'local').toLowerCase();

let BASE_URL;
let ADMIN_USER;
let ADMIN_PASS;

if (target === 'demo') {
  BASE_URL = process.env.DEMO_URL;
  ADMIN_USER = process.env.DEMO_ADMIN_USER;
  ADMIN_PASS = process.env.DEMO_ADMIN_PASS;
} else {
  BASE_URL = process.env.LOCAL_URL;
  ADMIN_USER = process.env.LOCAL_ADMIN_USER;
  ADMIN_PASS = process.env.LOCAL_ADMIN_PASS;
}

// Si falta algún dato se detiene todo con un mensaje claro, en vez de fallar más adelante sin explicación
if (!BASE_URL || !ADMIN_USER || !ADMIN_PASS) {
  throw new Error('Faltan datos del ambiente "' + target + '" en playwright/.env (copiar .env.example a .env y llenarlo)');
}

module.exports = { target, BASE_URL, ADMIN_USER, ADMIN_PASS };
