// Prepara en la demo pública los datos G4- que necesitan los casos de un ciclo manual
// y escribe la "hoja de datos" que Santiago les manda a Ignacio o a Andrés.
//
// Uso (desde la carpeta playwright):
//   node tools/preparar_datos_ciclo.js 2            crea lo que falte para el ciclo 2
//   node tools/preparar_datos_ciclo.js 2 --limpiar  primero borra los G4- que quedaron de otros días
//   node tools/preparar_datos_ciclo.js 2 --base     además crea G4-Ana Prueba y g4.ess01 si no existen
//                                                   (para el 2.º o 3.er día del ciclo 2, si la demo se reinició)
//   node tools/preparar_datos_ciclo.js limpiar      solo borra los G4- (al terminar el ciclo)
//
// Ciclo 1: no necesita datos (solo Admin); la hoja trae la URL, Admin y el formato de fecha.
// Ciclo 4: no usa este script. La regresión de Playwright crea sus datos en el global-setup y los borra en el teardown.
// --limpiar (y "limpiar") borra empleados G4-, usuarios g4.ess y los registros G4- de configuración,
// y al final cuenta lo que queda ("Verificación: Quedan 0 ...") o avisa con ADVERTENCIA.
//
// Ambiente: por defecto la demo (TARGET=demo). Para probarlo antes en la instancia local: TARGET=local.
// Las credenciales salen de playwright/.env, igual que en las pruebas automáticas.
if (!process.env.TARGET) {
  process.env.TARGET = 'demo';
}
const fs = require('fs');
const path = require('path');
const { request } = require('@playwright/test');
const ambiente = require('../ambiente');
const api = require('../helpers/api');

const args = process.argv.slice(2);
const ciclo = args[0];
const limpiar = args.includes('--limpiar') || ciclo === 'limpiar';
const crearBase = args.includes('--base') || ciclo === '3';

if (!['1', '2', '3', 'limpiar'].includes(ciclo)) {
  console.log('Uso: node tools/preparar_datos_ciclo.js <1|2|3|limpiar> [--limpiar] [--base]');
  process.exit(1);
}

const hoy = new Date();
const dos = function (n) { return String(n).padStart(2, '0'); };
const fechaHoy = hoy.getFullYear() + '-' + dos(hoy.getMonth() + 1) + '-' + dos(hoy.getDate());
// Clave de los usuarios de prueba g4.ess01 y g4.ess02 de la demo. Se genera al azar la primera vez y se guarda
// en kit_ejecucion/datos/clave_ess.txt (esa carpeta no se sube a GitHub), así es la misma todos los días del sprint
// y no queda escrita en el código, que es público. Cumple la política: mayúscula, minúscula, número y símbolo
const CARPETA_DATOS = path.join(__dirname, '..', '..', 'kit_ejecucion', 'datos');
const ARCHIVO_CLAVE = path.join(CARPETA_DATOS, 'clave_ess.txt');
function claveEss() {
  if (fs.existsSync(ARCHIVO_CLAVE)) {
    return fs.readFileSync(ARCHIVO_CLAVE, 'utf8').trim();
  }
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let azar = '';
  for (let i = 0; i < 8; i++) {
    azar = azar + letras[require('crypto').randomInt(letras.length)];
  }
  const clave = 'G4-' + azar + 'a7!';
  fs.mkdirSync(CARPETA_DATOS, { recursive: true });
  fs.writeFileSync(ARCHIVO_CLAVE, clave + '\n', 'utf8');
  return clave;
}
const CLAVE_ESS = claveEss();

const NOMBRES = {
  tipoLicencia: 'G4-Vacaciones',
  cliente: 'G4-Cliente QA',
  proyecto: 'G4-Proyecto QA',
  actividad: 'G4-Pruebas',
  evento: 'G4-Viaje de trabajo',
  tipoGasto: 'G4-Transporte'
};

const avisos = [];
function aviso(texto) {
  avisos.push(texto);
  console.log('ADVERTENCIA: ' + texto);
}

async function iniciarSesion() {
  const contexto = await request.newContext({ baseURL: ambiente.BASE_URL });
  const pagina = await contexto.get('/web/index.php/auth/login');
  const encontrado = (await pagina.text()).match(/:token="&quot;(.+?)&quot;"/);
  if (!encontrado) {
    throw new Error('No se encontró el token del login en ' + ambiente.BASE_URL + '. ¿La demo está caída?');
  }
  const respuesta = await contexto.post('/web/index.php/auth/validate', {
    form: { _token: encontrado[1], username: ambiente.ADMIN_USER, password: ambiente.ADMIN_PASS }
  });
  if (!respuesta.url().includes('dashboard')) {
    throw new Error('No se pudo entrar como Admin en la demo. Probar a mano en el navegador: si Admin / admin123 tampoco entra, alguien cambió la clave de la demo y hay que esperar a que se reinicie.');
  }
  return contexto;
}

async function lista(contexto, ruta) {
  const json = await api.llamar(contexto, 'GET', ruta);
  return json.data;
}

async function empleadosQueEmpiezanCon(contexto, texto) {
  const todos = await api.buscarEmpleados(contexto, texto);
  return todos.filter(function (e) { return (e.firstName + ' ' + e.lastName).startsWith(texto); });
}

async function usuarioPorNombre(contexto, usuario) {
  const usuarios = await lista(contexto, 'admin/users?limit=50&username=' + encodeURIComponent(usuario));
  return usuarios.find(function (u) { return u.userName === usuario; });
}

// Lo que se borra al limpiar: empleados G4- (con sus usuarios) y los registros G4- de configuración que
// crea este script o que crean los casos (vacantes, candidatos, KPI). Cada tipo se intenta por separado:
// si la demo no deja borrar uno, se avisa y se sigue con los demás
const LIMPIABLES = [
  { nombre: 'tipos de licencia', lista: 'leave/leave-types?limit=0', borrar: 'leave/leave-types', texto: function (x) { return x.name; } },
  { nombre: 'proyectos de Time', lista: 'time/projects?limit=0', borrar: 'time/projects', texto: function (x) { return x.name; } },
  { nombre: 'clientes de Time', lista: 'time/customers?limit=0', borrar: 'time/customers', texto: function (x) { return x.name; } },
  { nombre: 'eventos de Claim', lista: 'claim/events?limit=0', borrar: 'claim/events', texto: function (x) { return x.name; } },
  { nombre: 'tipos de gasto', lista: 'claim/expenses/types?limit=0', borrar: 'claim/expenses/types', texto: function (x) { return x.name; } },
  { nombre: 'vacantes', lista: 'recruitment/vacancies?limit=0', borrar: 'recruitment/vacancies', texto: function (x) { return x.name; } },
  { nombre: 'candidatos', lista: 'recruitment/candidates?limit=0', borrar: 'recruitment/candidates', texto: function (x) { return (x.firstName || '') + ' ' + (x.lastName || ''); } },
  { nombre: 'KPI', lista: 'performance/kpis?limit=0', borrar: 'performance/kpis', texto: function (x) { return x.title || ''; } }
];

async function registrosG4(contexto, tipo) {
  const todos = await lista(contexto, tipo.lista);
  return todos.filter(function (x) { return tipo.texto(x).trim().startsWith('G4-'); });
}

async function usuariosG4(contexto) {
  const encontrados = [];
  for (const nombre of ['g4.ess01', 'g4.ess02']) {
    const u = await usuarioPorNombre(contexto, nombre);
    if (u) {
      encontrados.push(u);
    }
  }
  return encontrados;
}

async function borrarDatosG4(contexto) {
  // Primero lo que depende de los empleados (candidatos, vacantes, proyectos), después los empleados
  const orden = ['candidatos', 'vacantes', 'KPI', 'proyectos de Time', 'clientes de Time', 'tipos de licencia', 'eventos de Claim', 'tipos de gasto'];
  const borrados = {};
  for (const nombre of orden) {
    const tipo = LIMPIABLES.find(function (t) { return t.nombre === nombre; });
    try {
      const encontrados = await registrosG4(contexto, tipo);
      if (encontrados.length > 0) {
        await api.llamar(contexto, 'DELETE', tipo.borrar, { ids: encontrados.map(function (x) { return x.id; }) });
      }
      borrados[nombre] = encontrados.length;
    } catch (error) {
      aviso('No se pudieron borrar los ' + nombre + ' G4- (' + error.message.slice(0, 100) + '). No afecta los casos: la demo se reinicia sola.');
    }
  }
  const empleados = await empleadosQueEmpiezanCon(contexto, 'G4-');
  if (empleados.length > 0) {
    await api.borrarEmpleados(contexto, empleados.map(function (e) { return e.empNumber; }));
  }
  for (const u of await usuariosG4(contexto)) {
    await api.llamar(contexto, 'DELETE', 'admin/users', { ids: [u.id] });
  }
  const resumen = Object.keys(borrados).map(function (k) { return borrados[k] + ' ' + k; }).join(', ');
  console.log('Limpieza: se borraron ' + empleados.length + ' empleados G4- (y sus usuarios)' + (resumen ? '; ' + resumen : ''));

  // Verificación, igual que en el teardown de Playwright
  const quedanEmpleados = (await empleadosQueEmpiezanCon(contexto, 'G4-')).length;
  const quedanUsuarios = (await usuariosG4(contexto)).length;
  let quedanOtros = 0;
  for (const tipo of LIMPIABLES) {
    try {
      quedanOtros = quedanOtros + (await registrosG4(contexto, tipo)).length;
    } catch (error) {
      // si la lista no se puede leer ya se avisó arriba
    }
  }
  const texto = 'Quedan ' + quedanEmpleados + ' empleados G4-, ' + quedanUsuarios + ' usuarios g4.ess y ' + quedanOtros + ' registros G4- de configuración en la demo';
  if (quedanEmpleados === 0 && quedanUsuarios === 0 && quedanOtros === 0) {
    console.log('Verificación: ' + texto);
  } else {
    aviso(texto + '. Revisar a mano (buscar "G4-" en PIM, Admin > Users y en cada módulo).');
  }
}

async function empleado(contexto, nombre, apellido) {
  const existentes = await empleadosQueEmpiezanCon(contexto, nombre + ' ' + apellido);
  if (existentes.length > 0) {
    return { empNumber: existentes[0].empNumber, employeeId: existentes[0].employeeId, nuevo: false };
  }
  const creado = await api.crearEmpleado(contexto, nombre, apellido, api.idUnico());
  return { empNumber: creado.empNumber, employeeId: creado.employeeId, nuevo: true };
}

async function usuarioEss(contexto, usuario, empNumber) {
  const existente = await usuarioPorNombre(contexto, usuario);
  if (existente) {
    return false;
  }
  await api.crearUsuario(contexto, empNumber, usuario, CLAVE_ESS);
  return true;
}

async function tipoLicencia(contexto) {
  const tipos = await lista(contexto, 'leave/leave-types?limit=0');
  const existente = tipos.find(function (t) { return t.name === NOMBRES.tipoLicencia; });
  if (existente) {
    return existente;
  }
  return await api.crearTipoLicencia(contexto, NOMBRES.tipoLicencia);
}

async function asegurarPeriodo(contexto) {
  const respuesta = await contexto.get('/web/index.php/api/v2/leave/leave-period');
  if (respuesta.ok() && (await respuesta.json()).meta.leavePeriodDefined === true) {
    return;
  }
  await api.llamar(contexto, 'PUT', 'leave/leave-period', { startMonth: 1, startDay: 1 });
}

async function saldo(contexto, empNumber, tipo, periodo, dias) {
  const ruta = 'leave/leave-entitlements?empNumber=' + empNumber + '&leaveTypeId=' + tipo.id + '&fromDate=' + periodo.startDate + '&toDate=' + periodo.endDate;
  const actuales = await lista(contexto, ruta);
  if (actuales.length > 0) {
    return false;
  }
  await api.asignarSaldo(contexto, empNumber, tipo.id, periodo.startDate, periodo.endDate, dias);
  return true;
}

// Días hábiles fijos a partir del lunes 16/11/2026 (la semana después del sprint), para que las fechas
// de la hoja no cambien si el script se corre otra vez al día siguiente. Si esa fecha ya está muy cerca, se usa hoy + 7
async function diasHabiles(contexto, cantidad) {
  const semana = (await api.llamar(contexto, 'GET', 'leave/workweek?model=indexed')).data;
  let inicio = new Date(2026, 10, 16);
  const minimo = new Date();
  minimo.setDate(minimo.getDate() + 7);
  if (inicio < minimo) {
    inicio = minimo;
  }
  const limite = new Date(inicio);
  limite.setDate(limite.getDate() + 60);
  const texto = function (f) { return f.getFullYear() + '-' + dos(f.getMonth() + 1) + '-' + dos(f.getDate()); };
  const feriados = (await lista(contexto, 'leave/holidays?fromDate=' + texto(inicio) + '&toDate=' + texto(limite) + '&limit=200'))
    .map(function (f) { return f.date; });
  const dias = [];
  const f = new Date(inicio);
  while (dias.length < cantidad) {
    if (semana[String(f.getDay())] === 0 && !feriados.includes(texto(f))) {
      dias.push(texto(f));
    }
    f.setDate(f.getDate() + 1);
  }
  return dias;
}

async function porNombre(contexto, ruta, nombre) {
  const elementos = await lista(contexto, ruta);
  return elementos.find(function (e) { return e.name === nombre; });
}

async function asegurar(contexto, rutaLista, rutaCrear, datos) {
  const existente = await porNombre(contexto, rutaLista, datos.name);
  if (existente) {
    return existente;
  }
  return (await api.llamar(contexto, 'POST', rutaCrear, datos)).data;
}

async function prepararTime(contexto, hoja) {
  try {
    const cliente = await asegurar(contexto, 'time/customers?limit=0', 'time/customers', { name: NOMBRES.cliente, description: 'Datos de prueba del Grupo 4' });
    const proyecto = await asegurar(contexto, 'time/projects?limit=0', 'time/projects', { name: NOMBRES.proyecto, customerId: cliente.id, description: 'Datos de prueba del Grupo 4', projectAdminsEmpNumbers: [] });
    // En OrangeHRM 5 la ruta de actividades va con "project" en singular; se prueba también en plural por si cambia
    try {
      await asegurar(contexto, 'time/project/' + proyecto.id + '/activities?limit=0', 'time/project/' + proyecto.id + '/activities', { name: NOMBRES.actividad });
    } catch (error) {
      await asegurar(contexto, 'time/projects/' + proyecto.id + '/activities?limit=0', 'time/projects/' + proyecto.id + '/activities', { name: NOMBRES.actividad });
    }
    hoja['PROYECTO'] = NOMBRES.cliente + ' - ' + NOMBRES.proyecto;
    hoja['ACTIVIDAD'] = NOMBRES.actividad;
  } catch (error) {
    aviso('No se pudo crear el proyecto de Time por la API (' + error.message.slice(0, 120) + '). Crearlo a mano como Admin: Time > Project Info > Customers > Add "' + NOMBRES.cliente + '"; Projects > Add "' + NOMBRES.proyecto + '" con ese cliente; en el proyecto, Activities > Add "' + NOMBRES.actividad + '".');
    hoja['PROYECTO'] = NOMBRES.cliente + ' - ' + NOMBRES.proyecto + ' (crear a mano, ver advertencias)';
    hoja['ACTIVIDAD'] = NOMBRES.actividad;
  }
}

async function prepararClaim(contexto, hoja) {
  try {
    await asegurar(contexto, 'claim/events?limit=0', 'claim/events', { name: NOMBRES.evento, description: 'Datos de prueba del Grupo 4', status: true });
    await asegurar(contexto, 'claim/expenses/types?limit=0', 'claim/expenses/types', { name: NOMBRES.tipoGasto, description: 'Datos de prueba del Grupo 4', status: true });
  } catch (error) {
    aviso('No se pudo crear el evento o el tipo de gasto de Claim por la API (' + error.message.slice(0, 120) + '). Crearlos a mano como Admin: Claim > Configuration > Events > Add "' + NOMBRES.evento + '" (Active) y Expense Types > Add "' + NOMBRES.tipoGasto + '" (Active).');
  }
  hoja['EVENTO'] = NOMBRES.evento;
  hoja['TIPO DE GASTO'] = NOMBRES.tipoGasto;
}

async function puesto(contexto, empNumbers, hoja) {
  const puestos = await lista(contexto, 'admin/job-titles?limit=0');
  if (puestos.length === 0) {
    aviso('La demo no tiene puestos (Job Titles). Crear uno a mano: Admin > Job > Job Titles > Add "G4-QA Tester".');
    hoja['PUESTO'] = 'G4-QA Tester (crear a mano)';
    return;
  }
  const elegido = puestos.find(function (p) { return /qa/i.test(p.title); }) || puestos[0];
  hoja['PUESTO'] = elegido.title;
  for (const empNumber of empNumbers) {
    try {
      await api.llamar(contexto, 'PUT', 'pim/employees/' + empNumber + '/job-details', {
        joinedDate: null, jobTitleId: elegido.id, jobCategoryId: null, subunitId: null, locationId: null, empStatusId: null
      });
    } catch (error) {
      aviso('No se pudo poner el puesto "' + elegido.title + '" por la API. Ponerlo a mano: PIM > G4-Ana > Job > Job Title = "' + elegido.title + '" > Save.');
      return;
    }
  }
}

async function main() {
  console.log('Ambiente: ' + ambiente.target + ' (' + ambiente.BASE_URL + ') | ciclo ' + ciclo + ' | ' + fechaHoy);
  const contexto = await iniciarSesion();
  console.log('Login como Admin: OK');

  if (limpiar) {
    await borrarDatosG4(contexto);
  }
  if (ciclo === 'limpiar') {
    await contexto.dispose();
    return;
  }

  const formato = await api.formatoFecha(contexto);
  const enPantalla = function (iso) { return api.formatear(iso, formato); };
  const hoja = {};
  hoja['DEMO'] = ambiente.BASE_URL;
  hoja['ADMIN'] = 'Admin / admin123 (credenciales públicas de la demo)';
  hoja['FORMATO DE FECHA'] = formato + ' (así se escriben las fechas en la demo)';

  if (ciclo === '2' || ciclo === '3') {
    hoja['CLAVE ESS'] = CLAVE_ESS + '  (para g4.ess01 y g4.ess02)';
    await asegurarPeriodo(contexto);
    const tipo = await tipoLicencia(contexto);
    hoja['TIPO DE LICENCIA'] = tipo.name;
    const dias = await diasHabiles(contexto, 6);
    const periodos = await lista(contexto, 'leave/leave-periods');
    const periodo = periodos.find(function (p) { return dias[0] >= p.startDate && dias[0] <= p.endDate; });

    let ana = null;
    if (crearBase) {
      ana = await empleado(contexto, 'G4-Ana', 'Prueba');
      const nuevoUsuario = await usuarioEss(contexto, 'g4.ess01', ana.empNumber);
      console.log('G4-Ana Prueba: ' + (ana.nuevo ? 'creada' : 'ya existía') + ' (Employee Id ' + ana.employeeId + '); g4.ess01: ' + (nuevoUsuario ? 'creado' : 'ya existía'));
      hoja['G4-ANA PRUEBA'] = 'Employee Id ' + ana.employeeId + ' · usuario g4.ess01';
    }

    const luis = await empleado(contexto, 'G4-Luis', 'Prueba');
    console.log('G4-Luis Prueba: ' + (luis.nuevo ? 'creado' : 'ya existía'));

    if (ciclo === '2') {
      const usuarioNuevo = await usuarioEss(contexto, 'g4.ess02', luis.empNumber);
      const saldoNuevo = await saldo(contexto, luis.empNumber, tipo, periodo, 5);
      console.log('g4.ess02: ' + (usuarioNuevo ? 'creado' : 'ya existía') + '; saldo de 5 días: ' + (saldoNuevo ? 'asignado' : 'ya tenía'));
      const borrar = await empleado(contexto, 'G4-Borrar', 'Prueba');
      console.log('G4-Borrar Prueba: ' + (borrar.nuevo ? 'creado' : 'ya existía'));
      hoja['G4-LUIS PRUEBA'] = 'usuario g4.ess02, con 5 días de ' + tipo.name + ' (CP-016)';
      hoja['G4-BORRAR PRUEBA'] = 'para CP-014 (se borra en ese caso)';
      hoja['D1'] = enPantalla(dias[0]);
      hoja['D2'] = enPantalla(dias[1]);
      hoja['E1'] = enPantalla(dias[2]);
      hoja['E2'] = enPantalla(dias[3]);
      for (let i = 0; i < 6; i++) {
        hoja['W' + (i + 1)] = enPantalla(dias[i]);
      }
    }

    if (ciclo === '3') {
      await prepararTime(contexto, hoja);
      await prepararClaim(contexto, hoja);
      await puesto(contexto, [ana.empNumber, luis.empNumber], hoja);
      hoja['G4-LUIS PRUEBA'] = 'evaluador de CP-024';
      hoja['R1'] = enPantalla(fechaHoy.slice(0, 8) + '01');
      hoja['R2'] = enPantalla(periodo.endDate);
    }
  }

  // Hoja de datos: consola y archivo de texto para mandarla por chat
  const lineas = [];
  lineas.push('HOJA DE DATOS · CICLO ' + ciclo + ' · ' + fechaHoy);
  lineas.push('Preparada por Santiago con preparar_datos_ciclo.js. Usar SOLO estos datos.');
  lineas.push('');
  for (const clave of Object.keys(hoja)) {
    lineas.push(clave.padEnd(18) + ' ' + hoja[clave]);
  }
  if (avisos.length > 0) {
    lineas.push('');
    lineas.push('PENDIENTE PARA SANTIAGO ANTES DE MANDAR LA HOJA:');
    avisos.forEach(function (a) { lineas.push('- ' + a); });
  }
  const texto = lineas.join('\n');
  console.log('\n' + texto);

  const carpeta = CARPETA_DATOS;
  fs.mkdirSync(carpeta, { recursive: true });
  const archivo = path.join(carpeta, 'datos_ciclo' + ciclo + '_' + fechaHoy + '.txt');
  fs.writeFileSync(archivo, texto + '\n', 'utf8');
  console.log('\nHoja guardada en ' + archivo);
  await contexto.dispose();
}

main().catch(function (error) {
  console.error('ERROR: ' + error.message);
  process.exit(1);
});
