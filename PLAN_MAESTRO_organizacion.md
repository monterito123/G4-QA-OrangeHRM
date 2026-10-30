# Plan maestro y calendario · Grupo 4 (desde el 30/10/2026)

## Organización definitiva

- **Ejecución, según el Anexo B del Plan del EX01:**
  - Ignacio ejecuta los ciclos 1 y 2.
  - Andrés ejecuta el ciclo 3.
  - Santiago ejecuta el ciclo 4.
  - No hay cambio de asignación que documentar, y Jira mantiene esos responsables.
- **Todo lo demás lo hace Santiago (con Claude):**
  - Ambientes y datos.
  - Jira: configuración, incidencias y métricas.
  - Las 10 herramientas, los scripts y las plantillas.
  - Las evidencias, la bitácora y los informes.
  - El PR02.
  - La revisión de lo que entregan Ignacio y Andrés.
- **Ignacio y Andrés hacen lo mínimo:** ejecutar sus casos con la guía, tomar las capturas, llenar el Excel, comentar en Jira, registrar sus defectos y devolver la carpeta.
- **Sin reuniones ni trabajo en grupo.** La comunicación es solo por chat: Santiago manda un kit y ellos devuelven las evidencias.
- **PR02 (4/11):**
  - Lo exponen los tres en clase.
  - Cada uno estudia solo su parte. Ignacio y Andrés tienen una hoja corta cada uno.
  - Santiago ensaya solo el total y graba el video del plan B.

### Ajustes respecto al Anexo B (actividades que no son de ejecución)

| Actividad del Anexo B | Responsable en el Anexo B | Cómo queda |
|---|---|---|
| Revisión de historias con el PO (02 y 03/11) | Ignacio y Andrés | Santiago, solo. El PO es un rol simulado; la decisión queda en la tarea G4QA-24 |
| Diseño de casos y datos con revisión entre pares (04 al 06/11) | Andrés e Ignacio | Los casos ya están en el Plan. Santiago prepara los datos (script) y el kit |
| Preparación del entorno y los datos en la demo (09/11) | Ignacio | Santiago corre `preparar_datos_ciclo.ps1` cada mañana y manda la hoja de datos |
| Ciclo 4 y reporte de defectos (12 y 13/11) | Santiago con apoyo de Ignacio | Santiago, solo (regresión automatizada con Playwright) |
| Retrospectiva (13/11) | Todo el equipo | Santiago la escribe. Ignacio y Andrés contestan 2 preguntas por chat (opcional, 5 min) |

## Ningún caso de los ciclos 1 a 3 necesita la instancia local

El Plan define la **demo pública** como la aplicación que se prueba (Tabla 3 y Anexo A). Los 27 casos se diseñaron para la demo. Solo la carga con JMeter es local, y esa ya está hecha. No hace falta pasar ningún caso al ciclo 4.

Ajustes de datos, sin cambiar los pasos del Plan:

- **CP-016:** usa un segundo usuario ESS, g4.ess02 (G4-Luis Prueba), con su propio saldo de 5 días. Si se usara g4.ess01, la solicitud de 2 días de CP-015 cambiaría el saldo de partida.
- **CP-018:** las dos solicitudes pendientes las crea Ignacio al empezar el caso (paso 1 de la guía).
- **CP-020:** la segunda hoja de tiempo enviada sale de CP-019. Andrés envía también la semana anterior.
- **CP-014, CP-009, CP-019, CP-021, CP-024, CP-025 y CP-027:** sus datos previos los crea el script (G4-Borrar, G4-Luis, proyecto, evento, tipo de gasto y puesto).

## Calendario

Columnas:
- **Claude:** lo que hace Claude cuando Santiago abre la sesión.
- **Santiago:** lo que hace con sus manos.
- **Ignacio / Andrés:** lo único que les toca.

| Fecha | Claude | Santiago (con sus manos) | Ignacio / Andrés (lo único) |
|---|---|---|---|
| **Vie 30/10** | Kit de ejecución, script de datos, guía de Jira, hojas del PR02, este plan | Pasar los correos de Ignacio y Andrés | — |
| **Vie 30/10 (tarde)** | Script de datos probado en la demo (ciclos 2 y 3). Plan B de Jira en los kits. Revisión de seguridad del repo. G4QA-24 listo para decidir | Correr `preparar_datos_ciclo.ps1 -Ciclo limpiar` (prueba la limpieza con conteo) y pegar la salida | — |
| **Sáb 31/10 – Dom 1/11** | Revisar la salida de la limpieza | Mandarles por chat su hoja del PR02 (`PR02_hoja_Ignacio.pdf`, `PR02_hoja_Andres.pdf`). `pr02_demo.ps1 -Humo -Reporte5s` | **Ambos:** recibir la hoja |
| **Lun 2/11 – Mar 3/11** | Preparar la decisión de G4QA-24 (lista de caracteres de CA-06.4) y lo que implica para CP-011 (d) y G4QA-23 | Revisión con el PO simulado: decidir G4QA-24 y comentarlo en Jira. **3/11:** ensayo solo del PR02 completo con cronómetro (23–25 min) y grabar el video del plan B | **Ambos:** estudiar solos su parte del PR02 con la hoja |
| **Mié 4/11** | — | `pr02_demo.ps1 -Humo` en la mañana. Exposición y demo | **Ambos:** exponer su parte en clase |
| **Hasta el vie 6/11** | **Correos → invitación a Jira → prueba de acceso.** En cuanto lleguen los correos: invitarlos con rol que permita comentar y crear incidencias, capturar la invitación y los permisos, y comprobar con ellos que entran | Pasarle a Claude los correos (a más tardar el 6/11) | **Ambos:** aceptar la invitación, entrar y abrir el tablero G4QA; mandar una captura a Santiago (5 min). Si no se logra antes del 9/11, se usa el Plan B de Jira de la guía |
| **Jue 5/11 – Vie 6/11** | Revisión final del kit con lo decidido en G4QA-24 (y `test.fail()` o el cambio de CP-011 d) | Mandar el kit por chat: a Ignacio su PDF, su Excel y la guía de Jira; a Andrés lo mismo más los 2 archivos de CP-022 | **Ambos:** abrir el kit y avisar si algo no se entiende (5 min) |
| **Lun 9/11** | Revisar la hoja de datos, las advertencias y el conteo de la limpieza | **Santiago, antes de las 8 a. m.:** `preparar_datos_ciclo.ps1 -Ciclo 2 -Limpiar` (borra lo G4- anterior, cuenta lo que queda y crea los datos del ciclo 2). Mandarle a Ignacio la hoja `kit_ejecucion\datos\datos_ciclo2_...txt`. Sirve también para el ciclo 1 (solo Admin) | **Ignacio:** ciclo 1 (CP-001, 002, 003, 026) y ciclo 2, primera parte (CP-001, 002, 003, 010, 011, 012, 013) |
| **Mar 10/11** | Igual | **Santiago, en la mañana:** `-Ciclo 2 -Base` (sin limpiar; recrea G4-Ana y g4.ess01 solo si la demo se reinició) y mandar la hoja | **Ignacio:** ciclo 2, segunda parte (CP-005, 006, 007, 004, 008, 009) |
| **Mié 11/11** | Revisar las dos hojas | **Santiago, en la mañana:** `-Ciclo 2 -Base` para Ignacio y `-Ciclo 3` para Andrés (**sin** `-Limpiar`, porque Ignacio sigue usando G4-Ana). Mandar cada hoja. Noche: `revisar_evidencias.ps1` con el ZIP de Ignacio | **Ignacio:** ciclo 2, final (CP-015, 016, 017, 018, 014) y mandar el ZIP. **Andrés:** ciclo 3, primera parte (CP-021, 022, 019, 020, 023) |
| **Jue 12/11** | Revisar las evidencias de Ignacio (Excel y capturas), pasarlas al índice y la bitácora, y calcular las métricas | **Santiago, en la mañana:** `-Ciclo 3` (sin limpiar) y mandar la hoja. Cuando Andrés avise que terminó: `-Ciclo limpiar` (deja la demo sin datos G4-, con el conteo en el log). Sesión exploratoria de 60 min en Admin y Leave (con capturas). Ciclo 4: `fase4_playwright.ps1` en local y en la demo | **Andrés:** ciclo 3, final (CP-024, 025, 026, 027) y mandar el ZIP |
| **Vie 13/11** | Revisar las evidencias de Andrés; preparar las métricas, el informe resumido, el Sign Off y la retrospectiva | `revisar_evidencias.ps1` con el ZIP de Andrés. Cerrar el ciclo 4. Revisar y entregar el informe y el Sign Off | **Ambos (opcional):** contestar por chat 2 preguntas de la retrospectiva |
| **Mié 11/11** (curso) | Fase 5: actualizar las acciones del workflow a Node 24 | QZ02, individual: certificado de GitHub Actions | Cada uno su QZ02 (es individual del curso) |
| **Mié 9/12** | Preparar el EX02 (25 casos, 15 errores, Sign Off) con lo ejecutado | Exposición del EX02 | Lo que pida el EX02 en clase |
| **Mié 16/12** | Preparar la defensa del P01 (5 casos automatizados) | Defensa del código | Lo que pida el P01 en clase |

## Lista maestra por herramienta (las 10 del EX01)

| Herramienta | Estado al 30/10 | Claude | Santiago (con sus manos) | Ignacio / Andrés (lo único, fecha) |
|---|---|---|---|---|
| Jira | En uso | Invitaciones, prueba de acceso, guía, G4QA-24 y G4QA-22, métricas | Pasar los correos (≤ 6/11); decidir G4QA-24 (2–3/11); registrar a su nombre si se usa el Plan B | Comentar resultados y registrar defectos durante su ciclo (9–12/11) |
| Plantillas Excel | Prellenadas | Revisar las devueltas y consolidar el registro y el informe de errores | Mandarlas (5–6/11) | Llenar resultado, fecha, estado y captura durante su ciclo |
| Chrome, Firefox y Edge | En uso (Playwright) | — | Ciclo 4 en los 3 navegadores (12–13/11) | Ejecutar en Chrome (9–12/11) |
| DevTools | En uso | — | — | CP-026: Ignacio (9/11, ciclo 1) y Andrés (12/11, ciclo 3) |
| Docker + OrangeHRM local | En uso | — | `pr02_demo.ps1` (antes del 3/11 y el 4/11) y ciclo 4 local | — |
| BlazeMeter | En uso (28/10) | — | Mostrarlo en el PR02 (4/11) | — |
| JMeter | En uso (28/10) | — | Prueba de humo en vivo en el PR02 (4/11) | — |
| Playwright | En uso | `test.fail()` o el cambio de CP-011 (d) según G4QA-24 | Ciclo 4: `fase4_playwright.ps1` (12–13/11) | — |
| GitHub | En uso (30/10) | Revisión de seguridad (hecha el 30/10) | `git push` cuando haya cambios | — |
| GitHub Actions | En uso (30/10) | Pasar las acciones a Node 24 (Fase 5) | `git push` y abrir la corrida (antes del 11/11) | — |

## Qué recibe cada uno por chat

| Para | Archivo | Cuándo |
|---|---|---|
| Ignacio | `PR02_presentacion\PR02_hoja_Ignacio.pdf` | Ya (antes del 1/11) |
| Andrés | `PR02_presentacion\PR02_hoja_Andres.pdf` | Ya (antes del 1/11) |
| Ignacio | `kit_ejecucion\Kit_Ciclos1y2_Ignacio.pdf`, `Registro_casos_Ciclos1y2_Ignacio.xlsx`, `Guia_Jira_G4QA.pdf` | 5 o 6/11 |
| Andrés | `kit_ejecucion\Kit_Ciclo3_Andres.pdf`, `Registro_casos_Ciclo3_Andres.xlsx`, `Guia_Jira_G4QA.pdf`, `archivos_CP-022\` (2 archivos) | 5 o 6/11 |
| Ignacio / Andrés | `kit_ejecucion\datos\datos_cicloN_<fecha>.txt` (hoja de datos del día) | Cada mañana de su ciclo |
| Santiago | El ZIP con las capturas y el Excel | Ignacio: 11/11 en la noche · Andrés: 12/11 en la noche |
