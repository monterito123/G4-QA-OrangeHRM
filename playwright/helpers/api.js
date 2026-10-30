// Funciones para preparar y borrar datos por la API REST v2 de OrangeHRM.
// Se usa la API (y no la pantalla) para los datos que una prueba NECESITA pero no está probando:
// es más rápido, no depende de otras pantallas y si falla se sabe que el problema es de preparación.
// La API solo pide la cookie de sesión de Admin (se confirmó en el Paso 0 con DevTools).
const path = require('path');
const { request } = require('@playwright/test');
const ambiente = require('../ambiente');

const SESION_ADMIN = path.join(__dirname, '..', 'auth', 'admin.json');
const RAIZ_API = '/web/index.php/api/v2/';

// Crea un "cliente" de la API con la sesión de Admin que dejó guardada el global-setup
async function nuevaApiAdmin() {
  return await request.newContext({ baseURL: ambiente.BASE_URL, storageState: SESION_ADMIN });
}

// Hace la llamada y, si la API responde con error, detiene la prueba mostrando qué falló
async function llamar(api, metodo, ruta, datos) {
  const respuesta = await api.fetch(RAIZ_API + ruta, { method: metodo, data: datos });
  if (!respuesta.ok()) {
    throw new Error(metodo + ' ' + ruta + ' respondió ' + respuesta.status() + ': ' + (await respuesta.text()));
  }
  return await respuesta.json();
}

// Identificador de la corrida, con fecha y hora (MMDDHHmmss). Va en el apellido de todo lo que se crea
function marcaDeCorrida() {
  const ahora = new Date();
  const dos = function (n) { return String(n).padStart(2, '0'); };
  return 'C' + dos(ahora.getMonth() + 1) + dos(ahora.getDate()) + dos(ahora.getHours()) + dos(ahora.getMinutes()) + dos(ahora.getSeconds());
}

// Employee Id único de 10 caracteres (el máximo que acepta OrangeHRM; con 11 la API da error 422).
// Junta la hora en milisegundos, el proceso (cada worker de Playwright es uno distinto) y un contador.
// Se escriben en base 36 (números y letras) para que quepan en pocos caracteres
let contador = 0;
function idUnico() {
  contador = contador + 1;
  const tiempo = Date.now().toString(36).slice(-5).toUpperCase();
  const proceso = String(process.pid % 10);
  const numero = contador.toString(36).padStart(2, '0').slice(-2).toUpperCase();
  return 'G4' + tiempo + proceso + numero;
}

async function crearEmpleado(api, nombre, apellido, employeeId) {
  const json = await llamar(api, 'POST', 'pim/employees', { firstName: nombre, middleName: '', lastName: apellido, employeeId: employeeId });
  return json.data;
}

// userRoleId 2 = ESS (empleado normal)
async function crearUsuario(api, empNumber, usuario, clave) {
  const json = await llamar(api, 'POST', 'admin/users', { username: usuario, password: clave, status: true, userRoleId: 2, empNumber: empNumber });
  return json.data;
}

// reportingMethodId 1 = Direct (jefe directo en Report-to)
async function asignarSupervisor(api, empNumber, supervisorEmpNumber) {
  const json = await llamar(api, 'POST', 'pim/employees/' + empNumber + '/supervisors', { empNumber: supervisorEmpNumber, reportingMethodId: 1 });
  return json.data;
}

async function crearTipoLicencia(api, nombre) {
  const json = await llamar(api, 'POST', 'leave/leave-types', { name: nombre, situational: false });
  return json.data;
}

// Las fechas de la API siempre van en formato año-mes-día, sin importar cómo las muestre la pantalla
async function asignarSaldo(api, empNumber, tipoLicenciaId, desde, hasta, dias) {
  const json = await llamar(api, 'POST', 'leave/leave-entitlements', { empNumber: empNumber, leaveTypeId: tipoLicenciaId, fromDate: desde, toDate: hasta, entitlement: String(dias) });
  return json.data;
}

async function buscarEmpleados(api, texto) {
  const json = await llamar(api, 'GET', 'pim/employees?nameOrId=' + encodeURIComponent(texto) + '&limit=200');
  return json.data;
}

async function contarEmpleadosPorId(api, employeeId) {
  const json = await llamar(api, 'GET', 'pim/employees?employeeId=' + encodeURIComponent(employeeId));
  return json.meta.total;
}

// Al borrar un empleado OrangeHRM también borra su usuario (confirmado en el Paso 0)
async function borrarEmpleados(api, empNumbers) {
  return await llamar(api, 'DELETE', 'pim/employees', { ids: empNumbers });
}

async function borrarTipoLicencia(api, id) {
  return await llamar(api, 'DELETE', 'leave/leave-types', { ids: [id] });
}

// Crea un ESS listo para usar: empleado + usuario. Opcional: saldo de vacaciones y un supervisor con usuario
async function prepararEss(api, opciones) {
  const corrida = process.env.G4_CORRIDA;
  // Clave generada en cada corrida para usuarios de prueba que se borran al final; no es una credencial real
  const clave = 'G4x' + Date.now() + '!';

  const empleado = await crearEmpleado(api, 'G4-Ess', corrida, idUnico());
  const usuario = 'g4ess' + idUnico().toLowerCase();
  await crearUsuario(api, empleado.empNumber, usuario, clave);
  const ess = { empNumber: empleado.empNumber, usuario: usuario, clave: clave };

  if (opciones.saldo) {
    const tipoId = Number(process.env.G4_TIPO_LICENCIA_ID);
    await asignarSaldo(api, empleado.empNumber, tipoId, opciones.periodo.startDate, opciones.periodo.endDate, opciones.saldo);
  }

  if (opciones.conSupervisor) {
    const jefe = await crearEmpleado(api, 'G4-Sup', corrida, idUnico());
    const usuarioJefe = 'g4sup' + idUnico().toLowerCase();
    await crearUsuario(api, jefe.empNumber, usuarioJefe, clave);
    await asignarSupervisor(api, empleado.empNumber, jefe.empNumber);
    ess.supervisor = { empNumber: jefe.empNumber, usuario: usuarioJefe, clave: clave };
  }

  return ess;
}

// ---------- Fechas ----------

function aTextoIso(fecha) {
  const dos = function (n) { return String(n).padStart(2, '0'); };
  return fecha.getFullYear() + '-' + dos(fecha.getMonth() + 1) + '-' + dos(fecha.getDate());
}

// Cada instalación define su formato de fecha: la local usa Y-m-d y la demo Y-d-m (confirmado en el Paso 0)
async function formatoFecha(api) {
  const json = await llamar(api, 'GET', 'admin/localization');
  return json.data.dateFormat;
}

// Convierte "2026-11-05" al formato de la pantalla, por ejemplo Y-d-m da "2026-05-11"
function formatear(textoIso, formato) {
  const partes = textoIso.split('-');
  return formato.replace('Y', partes[0]).replace('m', partes[1]).replace('d', partes[2]);
}

function periodoDe(periodos, textoIso) {
  for (const periodo of periodos) {
    if (textoIso >= periodo.startDate && textoIso <= periodo.endDate) {
      return periodo;
    }
  }
  throw new Error('No hay período de licencias que incluya ' + textoIso);
}

// Busca N días hábiles reales a partir de dentro de 7 días: salta fines de semana y feriados
// según la configuración del ambiente. El rango no puede quedar partido entre dos períodos de licencia.
async function buscarDiasHabiles(api, cantidad) {
  // Semana laboral por día (0 = domingo ... 6 = sábado): 0 es día completo, 4 medio día y 8 no se trabaja
  const semana = (await llamar(api, 'GET', 'leave/workweek?model=indexed')).data;
  const periodos = (await llamar(api, 'GET', 'leave/leave-periods')).data;

  const inicio = new Date();
  inicio.setDate(inicio.getDate() + 7);
  const limite = new Date(inicio);
  limite.setDate(limite.getDate() + 90);
  const feriadosJson = await llamar(api, 'GET', 'leave/holidays?fromDate=' + aTextoIso(inicio) + '&toDate=' + aTextoIso(limite) + '&limit=200');
  const feriados = feriadosJson.data.map(function (f) { return f.date; });

  let dias = [];
  const fecha = new Date(inicio);
  while (dias.length < cantidad) {
    const texto = aTextoIso(fecha);
    if (dias.length > 0 && periodoDe(periodos, texto).startDate !== periodoDe(periodos, dias[0]).startDate) {
      dias = [];
    }
    const esLaborable = semana[String(fecha.getDay())] === 0;
    if (esLaborable && !feriados.includes(texto)) {
      dias.push(texto);
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  return { desde: dias[0], hasta: dias[dias.length - 1], dias: dias, periodo: periodoDe(periodos, dias[0]) };
}

module.exports = {
  SESION_ADMIN,
  nuevaApiAdmin,
  llamar,
  marcaDeCorrida,
  idUnico,
  crearEmpleado,
  crearUsuario,
  asignarSupervisor,
  crearTipoLicencia,
  asignarSaldo,
  buscarEmpleados,
  contarEmpleadosPorId,
  borrarEmpleados,
  borrarTipoLicencia,
  prepararEss,
  formatoFecha,
  formatear,
  buscarDiasHabiles
};
