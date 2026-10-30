// Corre una sola vez al final. Borra todo lo que creó la corrida: empleados "G4-" (con sus usuarios,
// saldos y solicitudes) y el tipo de licencia. Así la demo compartida y la instancia local quedan limpias.
// Solo toca lo que lleva la marca de esta corrida en el apellido, nunca datos de otras personas.
// Al final vuelve a consultar por API y deja en el log cuánto quedó, para que la limpieza tenga evidencia.
const api = require('./helpers/api');

// Empleados "G4-" que devuelve la búsqueda por un texto (la marca de la corrida o "G4-")
async function empleadosG4(contexto, texto) {
  const empleados = await api.buscarEmpleados(contexto, texto);
  const encontrados = [];
  for (const empleado of empleados) {
    if (empleado.firstName.startsWith('G4-')) {
      encontrados.push(empleado);
    }
  }
  return encontrados;
}

// Tipos de licencia cuyo nombre lleva la marca de la corrida (por ejemplo "G4-Vacaciones C1030093308")
async function tiposDeLicenciaDeLaCorrida(contexto, corrida) {
  const json = await api.llamar(contexto, 'GET', 'leave/leave-types?limit=0');
  const encontrados = [];
  for (const tipo of json.data) {
    if (tipo.name.includes(corrida)) {
      encontrados.push(tipo);
    }
  }
  return encontrados;
}

module.exports = async function () {
  const corrida = process.env.G4_CORRIDA;
  if (!corrida) {
    return;
  }
  const contexto = await api.nuevaApiAdmin();

  // 1. Borrado. Si un borrado falla no se detiene: igual se verifica abajo y el log lo marca
  let borrados = 0;
  try {
    const empleados = await empleadosG4(contexto, corrida);
    const ids = [];
    for (const empleado of empleados) {
      ids.push(empleado.empNumber);
    }
    if (ids.length > 0) {
      await api.borrarEmpleados(contexto, ids);
    }
    borrados = ids.length;
  } catch (error) {
    console.log('ADVERTENCIA: falló el borrado de empleados: ' + error.message);
  }

  let tipoBorrado = false;
  if (process.env.G4_TIPO_LICENCIA_ID) {
    try {
      await api.borrarTipoLicencia(contexto, Number(process.env.G4_TIPO_LICENCIA_ID));
      tipoBorrado = true;
    } catch (error) {
      console.log('ADVERTENCIA: falló el borrado del tipo de licencia: ' + error.message);
    }
  }
  let textoTipo = ' y el tipo de licencia';
  if (!tipoBorrado) {
    textoTipo = ' (el tipo de licencia no se borró)';
  }
  console.log('Limpieza: se borraron ' + borrados + ' empleados G4-' + textoTipo + ' de la corrida ' + corrida);

  // 2. Verificación: se consulta otra vez por API lo que quedó
  try {
    const quedanEmpleados = (await empleadosG4(contexto, corrida)).length;
    const quedanTipos = (await tiposDeLicenciaDeLaCorrida(contexto, corrida)).length;
    const mensaje = 'Quedan ' + quedanEmpleados + ' empleados G4- y ' + quedanTipos + ' tipos de licencia de la corrida ' + corrida;
    if (quedanEmpleados === 0 && quedanTipos === 0) {
      console.log('Verificación: ' + mensaje);
    } else {
      console.log('ADVERTENCIA: ' + mensaje + '. Hay que borrarlos a mano (buscar "' + corrida + '" en PIM y en Leave Types)');
    }

    // Dato extra: empleados G4- de cualquier corrida en el ambiente (por ejemplo, de una corrida que se cortó)
    const deOtrasCorridas = (await empleadosG4(contexto, 'G4-')).length - quedanEmpleados;
    if (deOtrasCorridas === 0) {
      console.log('Verificación: quedan 0 empleados G4- de otras corridas en el ambiente');
    } else {
      console.log('ADVERTENCIA: quedan ' + deOtrasCorridas + ' empleados G4- de otras corridas en el ambiente');
    }
  } catch (error) {
    console.log('ADVERTENCIA: no se pudo verificar la limpieza: ' + error.message);
  }

  await contexto.dispose();
};
