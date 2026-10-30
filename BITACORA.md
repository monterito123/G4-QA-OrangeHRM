# Bitácora de pruebas reales — Grupo 4 (OrangeHRM)

Registro paso a paso de la configuración y ejecución de las herramientas que pusimos en la Estrategia y el Plan de pruebas del EX01. La idea es que cualquiera del grupo pueda repetir cada paso y que quede evidencia de lo que se hizo.

## Herramientas comprometidas en el EX01

| Herramienta | Uso | Estado |
|---|---|---|
| Jira (plan gratuito) | Historias, defectos, tablero del sprint | Listo: proyecto G4QA, 21 HU con story points (69), Sprint 1, defecto G4QA-22 y flujo del ciclo de vida del defecto |
| Plantillas Excel | Registro de casos e informe de errores | Pendiente (Fase 3) |
| Chrome, Firefox y Edge | Compatibilidad | Instalados; CP-001 ya corre en los tres con Playwright |
| DevTools de Chrome | Red, tiempos de carga, consola | Usado para analizar el login (Fase 2); falta CP-026 (Fase 3) |
| Docker + OrangeHRM local | Instancia para la prueba de carga | Listo: OrangeHRM 5.9 en http://localhost:8200 |
| BlazeMeter (extensión de Chrome) | Grabar el flujo login → Dashboard | Listo: flujo grabado y analizado |
| Apache JMeter | Carga de 50 usuarios en login y Dashboard | Listo: 50 simultáneos, 10 500 peticiones, cumple parcialmente |
| GitHub | Repositorio de los scripts | Pendiente (Fase 4) |
| Playwright | Regresión automatizada del ciclo 4 | Instalado 1.64.1; CP-001 automatizado y pasando |
| GitHub Actions | Correr Playwright en cada cambio | Pendiente (Fase 5) |

## Estructura de esta carpeta

```
06_PRUEBAS_REALES/
├── BITACORA.md            este archivo
├── docker/
│   └── docker-compose.yml OrangeHRM + MariaDB locales
├── scripts/
│   └── fase0_setup.ps1    verificación del entorno, JMeter y OrangeHRM
├── logs/                  salida de cada script (evidencia)
└── evidencias/            capturas y reportes
```

---

## Fase 0 — Entorno de trabajo

### 28/10/2026 — Paso 1: diagnóstico inicial

Comandos corridos en PowerShell (como administrador):

```powershell
node -v
npm -v
git --version
java -version
docker --version
wsl --status
```

Resultado:

| Herramienta | Resultado | Para qué la necesitamos |
|---|---|---|
| Node.js | v26.8.2 | Playwright corre sobre Node |
| npm | 11.19.1 | Instalar Playwright |
| Git | 2.56.0 | Versionar los scripts en GitHub |
| Java | No instalado | JMeter está hecho en Java |
| Docker | No instalado | Instancia local de OrangeHRM |
| WSL | No instalado | Docker Desktop corre sobre WSL 2 |

### 28/10/2026 — Paso 2: datos del equipo

```powershell
Get-ComputerInfo -Property OsName, OsVersion, OsBuildNumber, CsTotalPhysicalMemory, HyperVRequirementVirtualizationFirmwareEnabled
winget --version
code --version
```

- Windows 11 Enterprise, build 26300.
- 16 GB de RAM: alcanza para OrangeHRM + MariaDB en Docker y JMeter con 50 hilos.
- winget v1.29.380 y VS Code 1.137.0 instalados.

### 28/10/2026 — Paso 3: Java

```powershell
winget install --id EclipseAdoptium.Temurin.21.JDK -e
```

Se instaló Eclipse Temurin JDK 21.0.12 (LTS). Se usa una versión LTS porque es la que tiene soporte largo, igual que en un equipo de QA real.

### 28/10/2026 — Paso 4: WSL 2 y Docker Desktop

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
winget install --id Microsoft.WSL -e
winget install --id Docker.DockerDesktop -e
```

Después se reinició la computadora.

Comprobación: Docker Desktop 4.97.0 abre, con sesión iniciada y el motor encendido (aparece en "Resource Saver mode", que significa que está en reposo hasta que se use).

### 28/10/2026 — Paso 5: script de configuración (JMeter + OrangeHRM local)

Archivo: `scripts/fase0_setup.ps1`. Hace tres cosas y guarda todo en `logs/fase0_<fecha>.log`:

1. Imprime las versiones de todas las herramientas (evidencia del entorno).
2. Descarga Apache JMeter desde jmeter.apache.org, verifica el SHA512 contra el oficial (para confirmar que el archivo no viene alterado), lo descomprime en `C:\Herramientas` y lo agrega al PATH.
3. Levanta OrangeHRM + MariaDB con `docker/docker-compose.yml`. Intenta primero la imagen 5.9 (la misma versión de la demo pública), después la 5.8 y si no existen usa `latest`. La versión usada queda escrita en el log y en `docker/.env`.

Cómo correrlo:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\SantiagoMontero\Universidad\Calidad de Software\06_PRUEBAS_REALES\scripts\fase0_setup.ps1"
```

`-ExecutionPolicy Bypass` solo aplica a esa ejecución; no cambia la configuración de seguridad de Windows.

Resultado (log en `logs/fase0_2026-10-28_*.log`):

| Comprobación | Resultado |
|---|---|
| Java | Temurin 21.0.12.1 LTS |
| WSL | 2.7.14.0, kernel 6.18.33 |
| Docker | Engine 29.9.2, Compose v5.6.1, 14 CPUs y 7.7 GB de RAM asignados |
| JMeter | 5.6.3 descargado, SHA512 verificado, en `C:\Herramientas\apache-jmeter-5.6.3` y en el PATH |
| Imagen de OrangeHRM | `orangehrm/orangehrm:5.9` (misma versión que la demo pública) |
| Contenedores | `g4-orangehrm-db` (healthy) y `g4-orangehrm-app` (Up) |
| http://localhost:8200 | Responde 200 y redirige al instalador |

Observación: al final JMeter mostró `jmeter.log (Acceso denegado)`. No es un fallo de la instalación: JMeter guarda su log en la carpeta desde donde se ejecuta, y el script corrió desde `C:\Windows\system32`, donde no se puede escribir. Para las pruebas de carga se va a ejecutar desde la carpeta `jmeter/` de este proyecto.

### 28/10/2026 — Paso 6: instalador web de OrangeHRM

Se completó desde el navegador en http://localhost:8200/installer:

| Paso del instalador | Valor usado |
|---|---|
| Tipo | Fresh Installation |
| Licencia | GNU GPL v3 aceptada |
| Base de datos | Existing Empty Database, host `db`, puerto 3306, BD `orangehrm`, usuario `orangehrm` |
| System Check | Todo en verde: PHP 8.3.31, MariaDB 10.11.19, Apache 2.4.67, permisos de escritura OK |
| Organización | Grupo Alfa Servicios S.A. (el cliente ficticio de la estrategia), Costa Rica, English (United States), America/Costa_Rica |
| Usuario admin | `Admin` / (contraseña en `playwright\.env`, variable `LOCAL_ADMIN_PASS`) (Admin Grupo4, qa.grupo4@example.com) |
| Registro con OrangeHRM | Desmarcado (no se envían datos a OrangeHRM) |

Se usó inglés como idioma para que la instancia local tenga los mismos textos que la demo pública. Así los scripts de Playwright y JMeter sirven en los dos ambientes.

Comprobación (prueba de humo del entorno): login con `Admin` en http://localhost:8200/web/index.php/auth/login → redirige a `/dashboard/index` y carga el Dashboard. **Pasó.**

#### Datos de la instancia local

| Dato | Valor |
|---|---|
| URL | http://localhost:8200 |
| Usuario de la app | `Admin` / ver `LOCAL_ADMIN_PASS` en `playwright\.env` |
| Servidor de base de datos | `db`, puerto 3306 |
| Base de datos | `orangehrm` |
| Usuario de BD | `orangehrm` / ver `MARIADB_PASSWORD` en `docker\.env` |
| Root de BD | ver `MARIADB_ROOT_PASSWORD` en `docker\.env` |

Son credenciales de prueba solo para esta instancia local.

#### Comandos útiles de Docker

```powershell
cd "C:\Users\SantiagoMontero\Universidad\Calidad de Software\06_PRUEBAS_REALES\docker"
docker compose ps        # ver si está corriendo
docker compose stop      # apagar sin perder datos
docker compose start     # volver a encender
docker compose logs app  # ver errores de la app
```

Ojo: `docker compose down` borra los contenedores y habría que reinstalar OrangeHRM. Para apagar, usar `stop`.

### 28/10/2026 — Paso 7: Playwright y navegadores

Archivo: `scripts/fase0b_playwright.ps1`. Guarda todo en `logs/fase0b_<fecha>.log`:

1. Revisa que estén Chrome, Edge y Firefox (los tres navegadores del plan) e instala Firefox si falta.
2. Crea el proyecto de Playwright en `playwright/` con `npm init playwright` (JavaScript, navegadores Chromium y Firefox).
3. Copia la configuración del grupo (`scripts/plantillas/playwright.config.js`):
   - `baseURL` apunta a la demo pública; se puede cambiar a la local con la variable `BASE_URL=http://localhost:8200`.
   - Corre cada prueba en tres proyectos: `chromium`, `firefox` y `edge` (Edge real instalado en Windows). Eso cubre también la compatibilidad del plan.
   - Guarda captura, video y trace solo cuando una prueba falla, que es la evidencia para el informe de errores.
4. Copia la primera prueba automatizada: `tests/cp-001-login-valido.spec.js` (CP-001, login válido).
5. Corre la prueba en los tres navegadores y deja el reporte HTML en `playwright/playwright-report/`.

Cómo correrlo:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\SantiagoMontero\Universidad\Calidad de Software\06_PRUEBAS_REALES\scripts\fase0b_playwright.ps1"
```

Resultado (log en `logs/fase0b_2026-10-28_2038.log`):

| Comprobación | Resultado |
|---|---|
| Firefox | No estaba; se instaló la 157.0.1 con winget |
| Edge | 156.0.4314.50 |
| Chrome | Está instalado, pero no aparece en `winget list` (se instaló por fuera de winget). No afecta: Playwright usa su propio Chromium |
| Playwright | 1.64.1, con Chromium 156 y Firefox 157 descargados |
| CP-001 en Chromium | Pasó (26.2 s) |
| CP-001 en Edge | Pasó (15.3 s) |
| CP-001 en Firefox | Pasó (43.0 s) |
| Total | **3 de 3 pasaron en 49.8 s**, código de salida 0 |

Ajuste después de la primera corrida: en `playwright.config.js` se cambió `screenshot: 'only-on-failure'` por `screenshot: 'on'`, para que cada prueba deje su captura como evidencia aunque pase.

Evidencias: `evidencias/fase0/07_*` y `08_*`. El índice de todas las capturas está en `evidencias/INDICE.md`.

### Estado al cerrar la Fase 0

Herramientas instaladas y verificadas: Node, Git, Java, WSL, Docker, OrangeHRM 5.9 local, JMeter, Playwright, Chrome, Edge y Firefox.

Pendiente del lado de Santiago (requiere sus cuentas):

- [ ] Crear la cuenta gratuita de Jira (atlassian.com)
- [ ] Instalar la extensión de BlazeMeter en Chrome
- [ ] Crear el repositorio del Grupo 4 en GitHub

---

## Fase 2 — Rendimiento con BlazeMeter y JMeter

### 28/10/2026 — Paso 1: análisis del login de OrangeHRM

Antes de armar la prueba se revisó qué manda el navegador al iniciar sesión (DevTools / red):

1. `GET /web/index.php/auth/login` devuelve la página con un **token CSRF** dentro del HTML: `<auth-login :token="&quot;...&quot;">`.
2. `POST /web/index.php/auth/validate` manda `_token`, `username` y `password`, y redirige al Dashboard.
3. El Dashboard hace 7 llamadas a la API: `time-at-work`, `action-summary`, `shortcuts`, `buzz/feed`, `leaves`, `subunit` y `locations`.

El token cambia cada vez que se abre el login. Es una protección contra ataques CSRF (que otro sitio mande formularios en nombre del usuario).

### 28/10/2026 — Paso 2: grabación con BlazeMeter

- Extensión: BlazeMeter | The Continuous Testing Platform v6.6.10 para Chrome.
- Prueba grabada: `G4_Login_Dashboard_Local` (login con Admin en http://localhost:8200 y Dashboard).
- Exportado: `jmeter/grabacion/G4_Login_Dashboard_Local-Combined-JMeter-and-Selenium.yaml` (formato Taurus, con una parte HTTP para JMeter y otra Selenium).

Lo que muestra la grabación y por qué no se usó tal cual para la carga:

| Problema en la grabación | Consecuencia | Cómo se resolvió en el plan final |
|---|---|---|
| El `_token` quedó fijo (`943558bc...`) | Al repetir el script, el servidor rechaza el login porque ese token ya no es válido | **Correlación**: un Regular Expression Extractor lee el token nuevo en cada iteración y se manda como `${token}` |
| Incluye `https://www.google.com/search/warmup.html` (prefetch de Chrome) | Se mediría un sitio que no es OrangeHRM | Se dejaron solo peticiones a OrangeHRM |
| Configuración por defecto: 20 usuarios por 19-20 minutos | No coincide con el plan (50 usuarios) | Usuarios, rampa e iteraciones parametrizados |
| Sin validaciones | Una respuesta de error contaría como "éxito" | Aserciones en cada paso y límite de 3 s |
| Pausas reales de la grabación (36 s antes del login) | Distorsiona la carga | Pausas fijas de 2 s entre pasos |

Conclusión: BlazeMeter sirvió para **descubrir el flujo y las peticiones**; el script de carga se construyó a partir de eso, con correlación y validaciones. Así se trabaja normalmente: la grabación es el punto de partida, no el script final.

### 28/10/2026 — Paso 3: plan de JMeter

Archivo: `jmeter/G4_carga_login_dashboard.jmx`.

| Elemento | Detalle |
|---|---|
| Variables | `HOST=localhost`, `PORT=8200`, `USUARIO=Admin`, `CLAVE` (se pueden cambiar con `-J`) |
| Cookie Manager | Cada usuario virtual tiene su propia sesión; se limpia en cada iteración |
| Grupo de hilos | `usuarios` (50), `rampup` (30 s), `iteraciones` |
| 01_Abrir_login | GET login + extracción del token + aserción "auth-login" |
| 02_Iniciar_sesion | POST validate con el token + aserción "llegó a dashboard/index" + máximo 3 s |
| 03_Cargar_widgets_Dashboard | Las 7 llamadas a la API + código 200 + máximo 3 s cada una |
| 04_Cerrar_sesion | GET logout + aserción "volvió al login" |
| Pausas | 2 s entre abrir el login y entrar, y entre el Dashboard y el logout |
| Reporte | APDEX con 3 s como "satisfecho" y 6 s como "tolerable" |

Script: `scripts/fase2_jmeter.ps1`. Corre primero una **prueba de humo** (1 usuario) y solo si pasa sin errores lanza la carga.

### 28/10/2026 — Paso 4: primera corrida (50 usuarios, 30 s de rampa, 3 iteraciones)

Log: `logs/fase2_2026-10-28_2103.log`. Resultados en `jmeter/resultados/2026-10-28_2103_*`.

Prueba de humo: 14 muestras, **0 % de error**. Se lanzó la carga.

Carga:

| Transacción | Muestras | Error % | Promedio | P90 | P95 | Máximo |
|---|---|---|---|---|---|---|
| 01_Abrir_login | 150 | 0 | 61 ms | 77 ms | 87 ms | 115 ms |
| 02_Iniciar_sesion | 150 | 0 | 605 ms | 713 ms | 762 ms | 810 ms |
| 03_Cargar_widgets_Dashboard | 150 | 0 | 449 ms | 546 ms | 573 ms | 664 ms |
| 04_Cerrar_sesion | 150 | 0 | 116 ms | 144 ms | 157 ms | 236 ms |
| Total (2 100 peticiones) | | **0** | 139 ms | 502 ms | 585 ms | 810 ms |

Rendimiento: 47 peticiones por segundo en total. Duración: 45 s.

**Hallazgo al revisar los datos:** aunque se configuraron 50 usuarios, el máximo de usuarios activos **al mismo tiempo** fue 28. Cada usuario terminaba sus 3 vueltas (unos 16 s) antes de que la rampa de 30 s terminara de arrancar a los últimos. O sea, la prueba no cumplió todavía el criterio del plan ("50 usuarios simultáneos").

Corrección: se subieron las iteraciones a **15** (unos 80 s por usuario). Con la rampa de 30 s, entre el segundo 30 y el 80 los 50 usuarios están activos a la vez.

Evidencias: `evidencias/fase2/01` a `04`.

### 28/10/2026 — Paso 5: segunda corrida (50 usuarios simultáneos, 15 iteraciones)

Log: `logs/fase2_2026-10-28_2131.log`. Resultados en `jmeter/resultados/2026-10-28_2131_*`.

- Prueba de humo: 14 muestras, 0 % de error.
- Carga: **50 usuarios activos al mismo tiempo** (ahora sí se cumple el escenario del plan), 143 s de duración, 10 500 peticiones, 73 peticiones por segundo.

| Transacción | Muestras | Error % | Promedio | Mediana | P90 | P95 | P99 | Máximo |
|---|---|---|---|---|---|---|---|---|
| 01_Abrir_login | 750 | 0 | 183 ms | 150 ms | 315 ms | 413 ms | 801 ms | 1.4 s |
| 02_Iniciar_sesion | 750 | **6.13** | 1.6 s | 1.5 s | 2.4 s | **3.6 s** | 5.8 s | **7.1 s** |
| 03_Cargar_widgets_Dashboard | 750 | 0 | 1.4 s | 1.3 s | 1.9 s | **3.3 s** | 5.2 s | 6.4 s |
| 04_Cerrar_sesion | 750 | 0 | 360 ms | 318 ms | 571 ms | 713 ms | 1.7 s | 2.7 s |
| Total | 10 500 | 0.44 | 395 ms | 194 ms | 1.1 s | 1.6 s | 2.6 s | 7.1 s |

APDEX total (umbral 3 s): 0.990. Login: 0.939. Dashboard: 0.973.

#### Análisis de los errores

- Los 46 errores son **todos del login** (`POST /auth/validate`) y **todos por la aserción de duración**: el login respondió bien (código 200, entró al Dashboard), pero tardó más de 3 s. No hubo errores funcionales ni códigos 4xx/5xx.
- Las 7 llamadas a la API del Dashboard nunca pasaron de 3 s individualmente.
- Los errores se concentran entre el **segundo 30 y el 50**, justo cuando termina la rampa y los 50 usuarios hacen login casi a la vez. En ese tramo el login llegó a 7.1 s (ver `evidencias/fase2/09_grafico_usuarios_activos_vs_tiempo_login.png`).
- Del segundo 55 en adelante, con los mismos 50 usuarios activos, el sistema se estabiliza: el login máximo queda entre 2 y 2.9 s y la mediana en 1.3 a 2 s, sin errores.
- Dentro del login, la parte lenta es la validación en el servidor (`POST /auth/validate-0`, promedio 1.35 s). La redirección al Dashboard (`-1`) tarda poco (265 ms).

Hipótesis (no confirmada, falta medir el servidor): la validación de la contraseña y la creación de la sesión consumen CPU, y 50 logins al mismo tiempo se encolan. Hay que tomar en cuenta que JMeter, Docker y OrangeHRM corrieron en la **misma laptop**, así que el generador de carga le quitó recursos al servidor. En un ambiente real el generador va en otra máquina.

#### Resultado contra el criterio de la estrategia

Criterio: "El Dashboard carga en menos de 3 s con 50 usuarios simultáneos".

| Medida | Valor | ¿Cumple? |
|---|---|---|
| Dashboard, promedio | 1.4 s | Sí |
| Dashboard, P90 | 1.9 s | Sí |
| Dashboard, P95 | 3.3 s | No |
| Login, % mayor a 3 s | 6.1 % (todos en el pico de entrada) | No |

**Veredicto: cumple parcialmente.** En régimen estable con 50 usuarios el sistema responde dentro del límite, pero en el pico de entrada (los 50 haciendo login a la vez) el login y una parte de las cargas del Dashboard superan los 3 s.

Este resultado se registra como hallazgo de rendimiento para el Informe de errores del EX02 (severidad S3 media, prioridad P2), con la nota del ambiente.

Recomendaciones:

1. Repetir la prueba con el generador de carga en otra computadora para descartar que el problema sea del ambiente.
2. Medir CPU y memoria de los contenedores durante la prueba (`docker stats`).
3. Hacer una prueba de picos controlada (10, 25 y 50 logins simultáneos) para encontrar desde cuántos usuarios se pasa de 3 s.

Evidencias: `evidencias/fase2/05` a `09` y las capturas automáticas `reporte_2026-10-28_2131_carga_01` a `04`.

### Estado al cerrar la Fase 2

- BlazeMeter: usado para grabar y descubrir el flujo. ✔
- JMeter: prueba de humo y de carga con 50 usuarios simultáneos, con correlación, aserciones y reporte HTML. ✔
- Hallazgo de rendimiento documentado con análisis y recomendaciones. ✔

---

## Fase 1 — Jira

### 28/10/2026 — Paso 1: sitio y proyecto

- Sitio de Jira (plan gratuito): https://santiagomonterosancho.atlassian.net
- Jira creó solo dos espacios de ejemplo (KAN y SAM1, Kanban). No se usan: no tienen sprints ni el tipo de incidencia Error.
- Se creó el proyecto **G4 QA OrangeHRM** (clave **G4QA**), plantilla **Scrum**, gestionado por la empresa. Tipos de incidencia: Epic, Historia, Error, Tarea y Subtarea. Tablero: G4QA board.
- No se invitó al equipo todavía (Ignacio y Andrés se agregan con su correo cuando lo confirmen).
- Conexión: conector Atlassian de Claude autorizado sobre el sitio. Por ese conector se crearon las historias, el defecto y el sprint.

### 28/10/2026 — Paso 2: historias de usuario

Las 21 historias del Registro de HU del EX01 se cargaron como incidencias tipo **Historia**:

| Jira | Historia | Prioridad Jira | Etiquetas |
|---|---|---|---|
| G4QA-1 a G4QA-12 | HU-01 a HU-12 (Login, Admin, PIM, Leave) | Highest | módulo + P1 |
| G4QA-13 a G4QA-19 | HU-13 a HU-19 (Time, Recruitment, My Info, Performance, Claim) | Medium | módulo + P2 |
| G4QA-20 y G4QA-21 | HU-20 y HU-21 (Dashboard, Directory) | Low | módulo + P3 |

Cada historia lleva en la descripción: Como / Quiero / Para que, criterios de aceptación (Dado/Cuando/Entonces), escenarios de prueba, casos relacionados (CP-xxx), prioridad del registro y estimación.

Los puntos de historia se cargaron el 29/10 en el campo Story Points (ver Paso 7).

### 28/10/2026 — Paso 3: defecto de rendimiento

- **G4QA-22** (tipo Error): "[Rendimiento] El login tarda más de 3 s cuando 50 usuarios inician sesión al mismo tiempo". Severidad S3, prioridad P2 (Medium), etiquetas rendimiento, S3, P2, login, jmeter.
- Incluye entorno, pasos, resultado esperado y obtenido, evidencia y la nota sobre el ambiente.
- Vinculado ("Relates") con G4QA-1 (HU-01) y G4QA-20 (HU-20).

### 28/10/2026 — Paso 4: sprint

- **Sprint 1 - OrangeHRM 5.9**, del 02/11/2026 al 13/11/2026 (las fechas del Anexo B del Plan).
- Objetivo: "Ejecutar los 4 ciclos del Plan de pruebas (humo, P1, P2-P3 y regresión) sobre las 21 historias, con defectos registrados en Jira y Sign Off al cierre."
- Contiene las 22 incidencias (21 historias + 1 defecto). Estado: futuro (se inicia el 2 de noviembre).

### 29/10/2026 — Paso 5: ciclo de vida del defecto (figura 3 de la Estrategia)

Las historias siguen con el flujo simple de Jira (Por hacer, En curso, Listo). Los defectos ahora tienen su propio flujo: **G4 Ciclo de vida del defecto**, que solo usa el tipo **Error**.

| Estado | Categoría en Jira | Significado |
|---|---|---|
| Nuevo | Por hacer | El tester lo reportó y nadie lo ha revisado |
| Asignado | Por hacer | Se aceptó y tiene responsable |
| Reabierto | Por hacer | Se había corregido, pero en la verificación volvió a fallar |
| En corrección | En curso | El desarrollador lo está arreglando |
| Corregido | En curso | El desarrollador dice que ya quedó |
| En verificación | En curso | El tester repite el caso de prueba |
| Cerrado | Completado | La corrección funciona |
| Rechazado | Completado | No era defecto o estaba duplicado |

Transiciones (son las únicas que Jira permite, así nadie se salta un paso). Verificadas en Jira por API el 29/10: el flujo tiene 8 estados y 9 transiciones. La número 1 es la inicial (Create), con la que todo defecto nace en Nuevo:

| # | Transición | Origen | Destino | Tipo en Jira |
|---|---|---|---|---|
| 1 | Create | (inicio: al crear el defecto) | Nuevo | Inicial |
| 2 | Asignar | Nuevo | Asignado | Dirigida |
| 3 | Rechazar (inválido o duplicado) | Nuevo | Rechazado | Dirigida |
| 4 | Iniciar corrección | Asignado | En corrección | Dirigida |
| 5 | Marcar como corregido | En corrección | Corregido | Dirigida |
| 6 | Enviar a verificación | Corregido | En verificación | Dirigida |
| 7 | Cerrar (la corrección funciona) | En verificación | Cerrado | Dirigida |
| 8 | Reabrir (vuelve a fallar) | En verificación | Reabierto | Dirigida |
| 9 | Reasignar | Reabierto | Asignado | Dirigida |

Cómo se hizo:

1. Configuración de Jira → Actividades → Flujos de trabajo → Crear flujo. Se agregaron los 8 estados y las 9 transiciones en el editor, y se guardó con "Actualizar flujo de trabajo".
2. Proyecto G4QA → Configuración → Flujos de trabajo → Agregar flujo de trabajo → Agregar uno existente → "G4 Ciclo de vida del defecto" → se marcó solo el tipo **Error** → Terminar.
3. Publicar el borrador. Jira pide mapear los estados viejos de los defectos que ya existen: Por hacer pasa a Nuevo, En curso a En corrección y Listo a Cerrado. G4QA-22 quedó en **Nuevo**.
4. Comprobación por API: el flujo tiene 8 estados y 9 transiciones, y G4QA-22 solo ofrece "Asignar" y "Rechazar", que es lo que dice la figura 3.

### 29/10/2026 — Paso 6: columnas del tablero

Al publicar el flujo, G4QA-22 desapareció del backlog porque sus estados nuevos no estaban en ninguna columna. En Configuración del tablero → Columnas se asignaron así:

| Columna | Estados |
|---|---|
| Por hacer | Por hacer, Nuevo, Asignado, Reabierto |
| En curso | En curso, En corrección, Corregido, En verificación |
| Listo | Listo, Cerrado, Rechazado |

Tip para el equipo: si después de cambiar un flujo una incidencia "desaparece" del tablero, casi siempre es esto. Revisen la sección "Estados sin asignar".

### 29/10/2026 — Paso 7: story points

- El tablero estima con el campo **Story Points**, pero ese campo no estaba en la pantalla del proyecto. Se agregó a "G4QA: Scrum Default Issue Screen".
- Puntos cargados según la estimación del Registro de HU:

| Puntos | Historias |
|---|---|
| 5 | HU-03, 05, 10, 11, 12, 18 |
| 3 | HU-01, 02, 04, 06, 08, 13, 14, 16, 19 |
| 2 | HU-07, 09, 15, 17, 20, 21 |

- Total del Sprint 1: **69 puntos**, 22 incidencias (el defecto no lleva puntos: en Scrum se estiman historias, no defectos).

Evidencias: `evidencias/fase1/01` a `09`.

---

## Fase 4 — Regresión automatizada con Playwright (ciclo 4)

Objetivo: automatizar CP-002, CP-008, CP-010, CP-011, CP-012, CP-015, CP-016 y CP-017 en Chromium, Firefox y Edge, contra la instancia local y contra la demo, cambiando solo variables de entorno. Es también la base del P01 (16/12).

### 29/10/2026 — Paso 0: lo que se confirmó a mano antes de escribir código

Recorrido hecho en el navegador de Claude sobre la instancia local (y comparado con la demo). Ningún texto de las pruebas es supuesto.

| Flujo | Comportamiento real |
|---|---|
| Login con clave o usuario incorrecto | Aviso con rol `alert`: **"Invalid credentials"**; se queda en `/auth/login` (igual en la demo) |
| Login con campos vacíos | **"Required"** debajo de Username y de Password |
| ESS abre `/admin/viewSystemUsers` | La URL **no cambia** y el encabezado dice "Admin / User Management", pero en vez de la tabla sale el aviso **"Credential Required"**. El menú del ESS no tiene Admin ni PIM |
| ESS llama `GET /api/v2/admin/users` | **403** `{"message":"Unauthorized"}` |
| Add Employee sin nombre | **"Required"** en First Name y Last Name |
| Nombre de 31 caracteres | **"Should not exceed 30 characters"** (sale al escribir) |
| Employee Id repetido | **"Employee Id already exists"** (sale al salir del campo, sin guardar) |
| Employee Id de 11 caracteres por API | 422: el máximo es 10 |
| Add Employee válido | Aviso "Successfully Saved" → `/pim/viewPersonalDetails/empNumber/N`, título "Personal Details" y el Employee Id guardado |
| Employee List con Id existente | **"(1) Record Found"** y la fila con Id y nombre |
| Employee List con Id inexistente | **"No Records Found"** (dos veces: encabezado de la tabla y un aviso que se va solo) |
| Leave en instalación nueva | Error "Unexpected Error Occurred": falta definir el **período de licencias**. Se definió (1 ene – 31 dic) en Leave > Configure > Leave Period |
| Apply con saldo 10 | "Leave Balance" muestra **"10.00 Day(s)"**; al pedir 2 días hábiles: "Successfully Saved" |
| My Leave después de pedir | **"Pending Approval (2.00)"**, Number of Days 2.00 y saldo **8.00**: OrangeHRM descuenta lo pendiente desde que se pide |
| Pedir exactamente el saldo (8 de 8) | Se permite ("Successfully Saved") |
| Pedir saldo + 1 (9 de 8) | Antes de enviar, "Leave Balance" cambia a **"Balance not sufficient"**; al dar Apply sale el error **"Leave Balance Exceeded"** y no se guarda |
| Supervisor en Leave List | Ve la solicitud con botones **Approve** y **Reject** (filtro por defecto: pendientes del período actual) |
| Supervisor aprueba | **"Successfully Updated"**; el ESS la ve como **"Scheduled (2.00)"** |
| Saldo por API tras aprobar | entitled 10, scheduled 2, pending 8, balance 0 (en esa prueba manual había otra solicitud de 8 pendiente) |

Diferencias entre ambientes que afectan las pruebas:

| | Local | Demo |
|---|---|---|
| Formato de fecha (`/api/v2/admin/localization`) | `Y-m-d` | **`Y-d-m`** |
| Período de licencias | No venía definido (se definió) | Definido |
| Feriados nov–dic 2026 | Ninguno | 30/10, 11/11, 12/11, 25/12, 26/12… |
| Tipos de licencia | Ninguno | 11 (CAN-…, US-…) |
| Semana laboral | Lunes a viernes | Lunes a viernes |

Por eso las pruebas no escriben fechas fijas: calculan días hábiles reales con la semana laboral y los feriados de cada ambiente, y escriben la fecha en el formato que use.

Nota: el navegador de Claude no resolvía `localhost`, pero `127.0.0.1` sí. Es la misma instancia; el `.env` usa `http://127.0.0.1:8200`.

### 29/10/2026 — Paso 0: endpoints de la API REST v2

Base: `/web/index.php/api/v2/`. Todos funcionan solo con la cookie de sesión de Admin y cuerpo JSON (sin token extra). Se probaron en local; en la demo se probaron los de consulta.

| Para qué | Método y ruta | Cuerpo |
|---|---|---|
| Crear empleado | `POST pim/employees` | `firstName, middleName, lastName, employeeId` (máx. 10) |
| Crear usuario ESS | `POST admin/users` | `username, password, status: true, userRoleId: 2, empNumber` |
| Asignar supervisor | `POST pim/employees/{empNumber}/supervisors` | `empNumber` (del jefe), `reportingMethodId: 1` (Direct) |
| Crear tipo de licencia | `POST leave/leave-types` | `name, situational: false` |
| Asignar saldo | `POST leave/leave-entitlements` | `empNumber, leaveTypeId, fromDate, toDate, entitlement` |
| Definir período | `PUT leave/leave-period` | `startMonth: 1, startDay: 1` |
| Consultar | `GET leave/leave-period`, `leave/leave-periods`, `leave/workweek?model=indexed`, `leave/holidays?fromDate=&toDate=`, `admin/localization`, `pim/employees?nameOrId=` / `?employeeId=` | — |
| Borrar | `DELETE pim/employees` (`ids`; borra también el usuario), `DELETE leave/leave-types` (`ids`) | — |

### 29/10/2026 — Paso 1 y 2: estructura y decisiones

```
playwright/
  ambiente.js            lee .env y elige local o demo según TARGET
  .env.example           plantilla sin valores (el .env real no se sube)
  .gitignore             node_modules, .env, auth/, test-results, playwright-report, resultados
  playwright.config.js   chromium, firefox, edge; reporte HTML y JSON separados por ambiente
  global-setup.js        login de Admin por HTTP (con token CSRF, como en JMeter), período y tipo de licencia
  global-teardown.js     borra los empleados G4- y el tipo de licencia de la corrida
  helpers/api.js         crear/borrar empleado, usuario, supervisor, saldo; fechas hábiles
  helpers/login.js       iniciarSesion, iniciarSesionAdmin, cerrarSesion
  helpers/licencias.js   pasos de pantalla de Leave (tipo, fechas, saldo, My Leave)
  tests/regresion/       un archivo por caso (14 pruebas)
```

Decisiones:

- **Datos por API.** Lo que una prueba necesita pero no está probando (el ESS, su saldo, su supervisor) se crea por API: es rápido y si falla se sabe que es preparación, no el caso.
- **Pruebas independientes.** Cada prueba crea su propio ESS y su propia solicitud. CP-017 no usa la de CP-015. Se pueden correr en cualquier orden y en paralelo.
- **Marca de corrida.** Todo lo creado lleva nombre "G4-…" y como apellido la marca de la corrida (`C` + mes, día, hora, minuto y segundo). El teardown borra solo eso: nunca toca datos de otras personas en la demo.
- **Selectores.** Primero `getByRole`, `getByPlaceholder` y `getByText`. OrangeHRM no asocia sus etiquetas con los campos, así que `getByLabel` no sirve; para Employee Id, Leave Type y las fechas se usa el grupo `.oxd-input-group` que contiene la etiqueta, con un comentario en el código que explica el porqué.
- **Sin `waitForTimeout`.** Todas las esperas son `expect(...)` que reintentan hasta que se cumple.
- **Credenciales fuera del código.** Están en `playwright/.env`. CP-001 tenía `Admin/admin123` escrito en el código; se cambió para que lea el `.env`.
- **Clave de los ESS de prueba.** Se genera en cada corrida y los usuarios se borran al final; no es una credencial real.

### 29/10/2026 — Paso 3: ejecución

Script: `scripts\fase4_playwright.ps1` (lo corre Santiago desde PowerShell). Si falta `playwright\.env`, pide las claves antes de abrir el log, para que no queden escritas. Después corre seis etapas en orden y se detiene si una de las primeras cuatro falla:

| Etapa | Qué corre | Ambiente | Resultado | Tiempo |
|---|---|---|---|---|
| 1 | CP-002 y CP-012, Chromium | local | 5 de 5 | 11 s |
| 2 | CP-010 y CP-011, Chromium | local | 4 de 4 | 15 s |
| 3 | CP-008, Chromium | local | 1 de 1 | 5 s |
| 4 | CP-015, CP-016 y CP-017, Chromium | local | 4 de 4 | 25 s |
| 5 | Regresión completa, 3 navegadores | local | 42 de 42 | 3,0 min |
| 6 | Regresión completa, 3 navegadores | demo | 42 de 42 | 5,5 min |

- **0 fallos, 0 inestables, 0 omitidas:** ninguna prueba necesitó el reintento.
- **Limpieza:** el teardown borró los datos de cada corrida (27 empleados G4- en las etapas 5 y 6, más el tipo de licencia).
- **Primer intento:** a las 11:31 el script se detuvo porque se creó un `.env` sin claves. Se corrigió para que pida las claves también cuando el archivo existe vacío.
- **Defectos nuevos:** ninguno. No hubo fallos, así que no se registró nada en Jira.

Duración en segundos de cada prueba (etapas 5 y 6):

| Caso | Prueba | Chromium local | Firefox local | Edge local | Chromium demo | Firefox demo | Edge demo |
|---|---|---|---|---|---|---|---|
| CP-002 | Contraseña incorrecta | 2,7 | 9,8 | 5,3 | 8,4 | 10,7 | 10,2 |
| CP-002 | Usuario inexistente | 2,3 | 3,5 | 2,8 | 4,6 | 10,5 | 9,9 |
| CP-002 | Campos vacíos | 1,8 | 2,7 | 1,9 | 4,6 | 11,2 | 7,1 |
| CP-008 | ESS en URL de Admin y API 403 | 5,0 | 13,4 | 6,9 | 9,2 | 15,6 | 12,5 |
| CP-010 | Agregar empleado válido | 9,4 | 14,6 | 11,0 | 14,6 | 23,0 | 38,7 |
| CP-011 | Nombre vacío | 4,2 | 7,2 | 5,9 | 8,0 | 11,6 | 20,2 |
| CP-011 | Employee Id duplicado | 5,3 | 8,4 | 5,2 | 8,8 | 12,2 | 26,5 |
| CP-011 | Nombre de 31 caracteres | 3,6 | 6,8 | 6,5 | 7,5 | 11,3 | 14,0 |
| CP-012 | Buscar existente | 3,6 | 7,3 | 4,5 | 7,1 | 10,9 | 22,0 |
| CP-012 | Buscar inexistente | 3,4 | 6,7 | 5,0 | 7,7 | 10,4 | 11,5 |
| CP-015 | Pedir 2 de 10 días | 8,3 | 12,7 | 15,1 | 15,3 | 19,7 | 21,5 |
| CP-016 | Pedir exactamente el saldo | 7,5 | 11,0 | 13,3 | 13,3 | 18,6 | 18,0 |
| CP-016 | Pedir saldo + 1 | 7,8 | 13,0 | 12,1 | 13,6 | 17,3 | 18,9 |
| CP-017 | Supervisor aprueba | 14,2 | 25,2 | 20,7 | 24,4 | 36,1 | 34,1 |

Todas pasaron. La demo tarda entre 1,5 y 3 veces más que la local, porque es compartida y está en internet.

### 29/10/2026 — Paso 4: evidencia

- `evidencias/fase4/reporte_etapaN_<ambiente>/`: reporte HTML completo de cada etapa (abrir `index.html`).
- `evidencias/fase4/etapaN_<ambiente>_reporte.png`: captura del reporte de cada etapa.
- `evidencias/fase4/capturas_local/` y `capturas_demo/`: la captura final de cada una de las 42 pruebas por ambiente (`caso_hash_navegador.png`).
- Capturas revisadas a mano: `cp008_demo_edge.png` (Credential Required), `cp015_demo_chromium.png`, `cp016_excedido_demo_chromium.png` (My Leave sin registros) y `cp017_demo_firefox.png` (saldo 8.00 después de aprobar). En esta última la demo muestra el formato `yyyy-dd-mm` y la prueba igual pasó.
- Resultados en JSON por etapa: `logs/fase4_2026-10-29_1220_etapaN_<ambiente>.json`. Log completo: `logs/fase4_2026-10-29_1220.log`.

Cómo volver a correr:

```powershell
cd "C:\Users\SantiagoMontero\Universidad\Calidad de Software\06_PRUEBAS_REALES"
powershell -ExecutionPolicy Bypass -File .\scripts\fase4_playwright.ps1            # las 6 etapas
powershell -ExecutionPolicy Bypass -File .\scripts\fase4_playwright.ps1 -Etapa 6   # solo la demo
```

O a mano, desde `playwright`: `$env:TARGET="demo"; npx playwright test --grep "@regresion" --project=firefox`.

Limitaciones conocidas:

- My Leave y Leave List filtran por defecto el período de licencias actual. Si se corre a mediados de diciembre, las fechas pueden caer en el período siguiente y CP-015/016/017 no encontrarían la fila. No es un defecto de OrangeHRM: es el filtro por defecto.
- Si se corta la corrida con Ctrl+C, el teardown no se ejecuta y quedan empleados G4-<corrida>. Se borran a mano desde PIM buscando la marca de la corrida.
- La demo se reinicia sola cada cierto tiempo. Si eso pasa a media corrida, las pruebas pueden fallar sin que sea un defecto.

---

## Fase 4 (versión 2) — Evidencia por paso y alineación con el Plan (29/10/2026, tarde)

El encargo se amplió: cada prueba se divide en los pasos del caso en el Plan, cada paso deja su captura en el reporte y hay una corrida final con trace y video de todo. Al leer el Plan entregado (`03_ENTREGAS/EX01.../1-Plan de pruebas Grupo4.pdf`) se vio que varios casos tenían pasos que la versión 1 no cubría, así que se agregaron. Se pasó de 14 a 16 pruebas por navegador.

| Caso | Qué se agregó para coincidir con el Plan |
|---|---|
| CP-010 | Usar el Employee Id que genera OrangeHRM (paso 2 del Plan) y comprobar por API que es único |
| CP-011 | (b) 30 caracteres se aceptan y 31 no; (d) caracteres especiales en el nombre |
| CP-012 | Búsqueda por nombre, por Id y por nombre inexistente, con Reset después de cada una |
| CP-015 | Saldo de 5 días, como dice el prerrequisito del Plan (antes eran 10) |
| CP-016 | Cuatro intentos con saldo 5: 1 día, 5 días, 6 días y rango con la fecha final antes que la inicial |
| CP-017 | Paso 4: saldo final desde el reporte "My Leave Entitlements and Usage Report" |

### Paso 0 ampliado (recorrido a mano en el navegador de Claude)

Además de lo de la versión 1, se recorrieron por la interfaz: Admin > Add User, PIM > Report-to, Leave > Configure > Leave Types, Leave > Entitlements > Add, la búsqueda por nombre en Employee List, Apply con 1 día y con rango invertido, y el reporte de saldo. Mientras se usaba cada pantalla, un registro dentro de la página guardó las peticiones a la API (método, URL, cuerpo y respuesta).

| Hallazgo | Detalle |
|---|---|
| La interfaz usa los mismos cuerpos que los helpers | `POST admin/users` {username, password, status, userRoleId 2, empNumber}; `POST pim/employees/{n}/supervisors` {empNumber, reportingMethodId 1}; `POST leave/leave-types` {name, situational}; `POST leave/leave-entitlements` {…, entitlement: "1"} |
| Peticiones extra de la interfaz | `POST auth/public/validation/password` (fortaleza de la clave) y `GET core/validation/unique` (nombre de tipo repetido) |
| Entitlement suma | Si el empleado ya tiene saldo, Add Entitlement suma (5 + 1 = 6) y muestra "Updating Entitlement" |
| Tipos para el ESS | El ESS usa `GET leave/leave-types/eligible`; `leave-types` le responde 403 |
| 30 caracteres | Se aceptan; con 31 sale "Should not exceed 30 characters" |
| Caracteres especiales | `<>@#$%&*!` se guardan sin ningún mensaje ("Successfully Saved"). En pantalla se muestran escapados como texto (sin XSS) |
| Búsqueda por nombre | Funciona con el texto escrito, sin elegir la sugerencia. Nombre inexistente: la sugerencia y la tabla dicen "No Records Found". Reset deja los filtros vacíos |
| 1 día | En My Leave se lista solo con la fecha ("2026-11-10"), sin "to" |
| Rango invertido | "To date should be after from date"; Apply no hace nada |
| Reporte de saldo | `/leave/viewMyLeaveBalanceReport`; columnas Entitlements, Pending Approval, Scheduled, Taken y Balance. La tabla es una cuadrícula sin roles de tabla, así que los números se leen de `GET leave/reports/data?name=my_leave_entitlements_and_usage` (la misma API que la llena) |
| Filtro de Leave List | La ficha "Pending Approval" es un `.oxd-chip` sin rol accesible |

Evidencia del Paso 0 en `evidencias/fase4/exploracion/`: 22 capturas del recorrido y 9 paneles de red (uno por endpoint). Los paneles no son capturas de DevTools: esa ventana no se puede abrir desde las herramientas de Claude. Muestran las peticiones registradas desde la página, con los mismos datos que la pestaña Red, y así lo dice cada panel.

### Evidencia dentro de las pruebas

- `helpers/evidencia.js`: `capturar(page, testInfo, caso, paso, descripción)` toma la captura al final del paso y la adjunta al reporte con `testInfo.attach()`. Con `EVIDENCIA=1` también la copia a `evidencias/fase4/<ambiente>/<navegador>/` como `CP-016-saldo-mas-uno_paso-02_leave-balance-exceeded.png`.
- Cada prueba usa `test.step('Paso N: …')` con los pasos del Plan. La preparación por API va en un paso aparte sin captura (no hay pantalla que mostrar).
- `playwright.config.js`: `screenshot: 'on'` siempre; con `EVIDENCIA=1` también `trace: 'on'` y `video: 'on'`. Sin la variable quedan en `retain-on-failure`. No se edita el archivo para cambiar de modo.
- Script: las etapas 1 a 4 corren sin EVIDENCIA. La etapa 2b es solo CP-011 (d), aparte para que su falla esperada no detenga la corrida incremental. Las etapas 5 y 6 son la corrida final con EVIDENCIA=1. Opción nueva: `-Etapa final` corre solo las etapas 5 y 6.

### 29/10/2026 13:00 — Corrida completa (etapas 1 a 6)

| Etapa | Qué | Resultado | Tiempo |
|---|---|---|---|
| 1 | CP-002 y CP-012, Chromium, local | 4 de 4 | 10 s |
| 2 | CP-010 y CP-011 (a, b, c), Chromium, local | 4 de 4 | 18 s |
| 2b | CP-011 (d), Chromium, local | 0 de 1 (falla esperada) | 39 s |
| 3 | CP-008, Chromium, local | 1 de 1 | 6 s |
| 4 | CP-015, CP-016 y CP-017, Chromium, local | 6 de 6 | 31 s |
| 5 | Final, 3 navegadores, local (EVIDENCIA=1) | 45 pasaron, 3 fallaron | 5,1 min |
| 6 | Final, 3 navegadores, demo (EVIDENCIA=1) | 45 pasaron, 2 fallaron, 1 inestable | 8,7 min |

Corrida final: 96 ejecuciones (16 pruebas × 3 navegadores × 2 ambientes). Pasaron 90, fallaron 5 e hubo 1 inestable. Las 6 que no pasaron son todas CP-011 (d).

- **CP-011 (d) falla en los 6 escenarios:** OrangeHRM guarda `G4-<Ana>` sin mensaje y abre Personal Details. Es el comportamiento confirmado en el Paso 0, no un error del script. Se registró como **G4QA-23**.
- **El "inestable" de Edge en la demo era un falso positivo del script.** En el reintento, el Employee Id que generó la demo (0631) ya existía (la demo es compartida). Salió "Employee Id already exists", y la prueba lo tomó como el mensaje de validación del nombre porque buscaba cualquier mensaje de error del formulario. Corrección:
  - la prueba (d) usa un Employee Id propio (el Id no es lo que se prueba);
  - exige el mensaje dentro de `.--name-grouped-field` (solo los campos de nombre);
  - confirma por API que no se guardó.
- **Limpieza:** el teardown borró 42 empleados G4- en local y 41 en la demo. Por prueba y navegador se crean 14, contando los dos intentos de (d); en la demo, el reintento de Edge no guardó nada. Al revisar la demo después con la API: 0 empleados "G4-" y 0 tipos de licencia "G4-".

### Cambio pedido en la revisión: CP-016 con 6 días

Antes validaba el mensaje ("Balance not sufficient" y "Leave Balance Exceeded") y que My Leave quedara sin la solicitud, pero **no** que el saldo siguiera igual. Se agregó el paso 4:

- en Apply, el saldo sigue en "5.00 Day(s)";
- en el reporte: entitlement 5.00, pending 0.00, scheduled 0.00, balance 5.00.

El comportamiento no debería cambiar. En el Paso 0, después del intento rechazado de 9 días con saldo 8, el de 8 días exactos se aceptó: el rechazo no tocó el saldo. Queda por confirmarlo en la corrida automatizada (`-Etapa final`).

### Jira

- **G4QA-23** (Error, entra en **Nuevo** por la transición Create):
  - "[PIM] Add Employee acepta caracteres especiales (< >) en el nombre sin mensaje de validación (CP-011 d)".
  - **S4, prioridad Low**: S4 y no más porque la seguridad funciona (el nombre se muestra escapado) y no se dañan datos.
  - La descripción explica que **CA-06.4 no define qué caracteres son "no permitidos"**. Si el PO decide que OrangeHRM no tiene que restringirlos, se cierra con "Rechazar".
  - Vinculado (Relates) con G4QA-6 (HU-06). En el Sprint 1.
- **G4QA-24** (Tarea): "Revisión de historias con el PO: definir la lista de caracteres permitidos en el nombre (HU-06, CA-06.4)".
  - Vence el 3/11 y está en el Sprint 1.
  - Pide aceptar siempre tildes, eñe, apóstrofo, guion y espacios: Núñez, O'Connor, Rojas-Oviedo, María José.
  - Cuando se defina la lista, se completa la prueba (d) con esos casos positivos.
  - Vinculada (Relates) con G4QA-23 y con G4QA-6.
- **Adjuntos:** no se pudieron subir desde la automatización (el servicio de archivos de Atlassian está bloqueado desde la nube y desde la máquina virtual). Las rutas de la evidencia están en la descripción y en un comentario de G4QA-23. Hay que adjuntar a mano los dos PNG de `evidencias/fase4/jira/`.
- **Capturas:** `evidencias/fase4/jira/` (defecto en Nuevo, vínculos, tarea y las dos fallas).

### Decisiones nuevas

- **Pasos del Plan en `test.step`:** el reporte se lee como el caso de prueba, y en la defensa del P01 cada paso se señala en el código y en la captura.
- **Los números del reporte de saldo se leen de la API:** la tabla es un componente de cuadrícula sin roles; leerla por posición sería frágil. La captura muestra lo mismo para quien la revise.
- **CP-011 (d) no se ajustó para que pase:** valida lo que dice el Plan. Mientras G4QA-24 no se resuelva, va a fallar a propósito. Si el PO cambia el criterio, se actualiza la prueba.
- **Etapa 2b aparte:** una falla conocida del producto no tiene que frenar la corrida incremental.

### Corrida de confirmación (30/10/2026, 09:32)

Comando: `fase4_playwright.ps1 -Etapa final`, con la ruta completa. La primera vez falló porque PowerShell estaba en `C:\Windows\system32` y la ruta relativa no existía ahí.

| Ambiente | Pasaron | Fallaron | Inestables | Duración | Limpieza |
|---|---|---|---|---|---|
| Local | 45 | 3 | 0 | 4,4 min | 42 empleados G4- y el tipo de licencia de la corrida C1030093308 |
| Demo | 45 | 3 | 0 | 9,3 min | 42 empleados G4- y el tipo de licencia de la corrida C1030093741 |

- Las 6 que fallan son CP-011 (d), y fallan en el primer intento y en el reintento. El mensaje es "expect(locator).toBeVisible() failed / element(s) not found": no apareció ningún mensaje de validación en los campos del nombre. Esto confirma que la corrección funcionó: ya no hay falso positivo y el resultado es el mismo en los 6 navegadores y ambientes.
- CP-016 saldo + 1 pasó en los 6 con el paso 4 nuevo: el saldo sigue en 5.00 y el reporte muestra 0 pendientes y 0 programados. El comportamiento no cambió.
- Capturas por paso: 55 por carpeta (antes 54), por la captura del paso 4 de CP-016. Ya no está la captura del falso positivo, porque el script vacía las carpetas antes de la corrida final.
- Respaldo: `logs/fase4_2026-10-30_0932.log`, `fase4_2026-10-30_0932_etapa5_local.json` y `fase4_2026-10-30_0932_etapa6_demo.json`.

### Cierre de la Fase 4: evidencia por corrida y verificación de la limpieza (30/10/2026)

**Problema: se perdió una evidencia.** El script vaciaba `evidencias\fase4\<ambiente>\` antes de cada corrida final. Por eso la corrida del 30/10 borró la captura del falso positivo del 29/10, `demo/edge/CP-011d-caracteres_paso-03_mensaje-de-validacion.png`, que mostraba "Employee Id already exists" en lugar de una validación del nombre. También se perdieron las capturas por paso y los reportes de la corrida del 29/10 a las 13:00. De esa corrida quedan el log, los JSON en `logs\` y las capturas de la falla en `evidencias\fase4\jira\`. Fue un error de diseño del script: la evidencia de una prueba nunca se debe borrar para hacer espacio a la siguiente.

**Corrección del script (`fase4_playwright.ps1` y `helpers\evidencia.js`):**
- El script ya no borra nada. Cada corrida final se guarda en `evidencias\fase4\corridas\<AAAA-MM-DD_HHmm>\<ambiente>\`, con las capturas por paso de cada navegador, el reporte HTML y el resumen.
- El script le pasa la carpeta a Playwright con la variable `G4_CARPETA_EVIDENCIA`. Si alguien corre Playwright sin el script, la carpeta toma el nombre de la marca de la corrida (`C` + MMDDHHmmss), así que tampoco se pisa nada.
- `evidencias\fase4\ultima\local` y `ultima\demo` son junctions de Windows que apuntan a la corrida más reciente de cada ambiente. No ocupan espacio. Se actualizan al terminar cada corrida final, o con `-Etapa ultima`.
- Las carpetas existentes se reorganizaron sin borrar nada: `local\` y `demo\` pasaron a `corridas\2026-10-30_0932\`, y `_corrida_previa_2026-10-29_1220\` pasó a `corridas\2026-10-29_1220\`.

**Verificación del teardown (`global-teardown.js`):**
- Después de borrar, vuelve a consultar por API y escribe en el log: `Verificación: Quedan 0 empleados G4- y 0 tipos de licencia de la corrida C...`.
- Si queda algo, la línea empieza con `ADVERTENCIA:` y dice qué buscar para borrarlo a mano.
- También cuenta los empleados G4- de otras corridas en el ambiente, por ejemplo de una corrida que se cortó a la mitad.
- Si un borrado falla, la verificación corre igual y el fallo queda como advertencia.
- Se probó con una API simulada, con un borrado exitoso y uno fallido. En OrangeHRM real se comprueba en la próxima corrida.

**Jira (revisado el 30/10):**
- G4QA-23 tiene prioridad Low y severidad S4. La severidad está en la etiqueta S4 y en la descripción, porque el proyecto no tiene un campo de severidad.
- G4QA-24 existe y está vinculada ("Relates") con G4QA-23 y con G4QA-6. No faltaba nada.

**CP-011 (d) sigue sin `test.fail()`.** Se decide después de la revisión con el PO (2–3/11) y antes de la Fase 5.

### Regla de capturas y campo Severidad en Jira (30/10/2026, 10:04–10:25)

**Regla nueva (permanente, todas las fases):** cada acción deja una captura en `evidencias/<fase>/` con nombre `AAAA-MM-DD_HHmm_<qué-muestra>.png` y se registra en `INDICE.md`. Aplica a Jira (incluido todo lo que se haga con el conector, que se abre después en el navegador para capturarlo), OrangeHRM, Docker y el resumen de cada corrida. Cuando se modifica algo que ya existía, se captura el antes y el después. Los cambios de archivos se anotan aquí.

**Capturas atrasadas de esta sesión (21 de Jira y 2 de script):**
- G4QA-23: estado, descripción con la severidad, prioridad, Sprint, vínculos y los dos comentarios del 30/10.
- G4QA-24: descripción con Núñez, O'Connor y Rojas-Oviedo, fecha límite y vínculos. Al abrirla, Jira mostraba "Cambios sin guardar" en la descripción: es un borrador local del navegador y no se tocó. El texto guardado (leído por API) coincide con el de la captura.
- Prueba del teardown con API simulada: `fase4/script/2026-10-30_1009_teardown-api-simulada.log` y su `.png`. Al revisar el log apareció un detalle: si el tipo de licencia no se borraba, el mensaje igual decía "y el tipo de licencia". Se corrigió `global-teardown.js` para que diga "(el tipo de licencia no se borró)".
- Estructura de `corridas` y `ultima`: el Explorador de Windows solo se puede controlar con clics y otra ventana tapó la vista, así que la evidencia es un listado de la carpeta (`fase4/script/2026-10-30_1021_estructura-corridas-y-ultima.log` y `.png`).

**`-Etapa ultima`:** Santiago lo corrió a las 10:13 y se crearon `ultima/local` y `ultima/demo`. No quedó log porque el equipo tenía todavía la versión anterior del script: la copia se envió al mismo tiempo que la edición y se subió el archivo viejo. Ya está subida la versión correcta, que deja `logs/fase4_ultima_<fecha>.log` con el `dir` de `corridas` y de `ultima` (ahí se ve cada `<JUNCTION>` con su destino).

**Campo personalizado "Severidad" (customfield_10044):**
1. Antes: no existía ningún campo con ese nombre. La severidad solo estaba en la descripción y en etiquetas (S3 en G4QA-22, S4 en G4QA-23).
2. Se creó en Configuración > Incidencias > Campos como lista de selección de una opción: S1 Fallo/Legal, S2 Mayor, S3 Menor, S4 Incidental. Se añadió al esquema de campos "Default Field Scheme".
3. "Solo para el tipo Error": Jira ya no permite limitar el contexto global de un campo a ciertos tipos de actividad (lo avisa en la página del contexto). Por eso se limitó con la pantalla: se agregó solo a "G4QA: Scrum Bug Screen", que en el proyecto usa únicamente el tipo Error (esquema "G4QA: Scrum Issue Type Screen Scheme"). Las historias usan "G4QA: Scrum Default Issue Screen" y no lo muestran: verificado en G4QA-6.
4. Valores puestos con el conector y verificados en el navegador: G4QA-23 = S4 Incidental y G4QA-22 = S3 Menor. Las etiquetas S3 y S4 se dejan como respaldo.
5. Nota: la descripción de G4QA-22 dice "S3 – Media". El nombre de la opción en el campo es "S3 Menor", como se pidió; conviene revisar cuál término usa la Estrategia de pruebas y unificar.

- 10:26: Santiago volvió a correr `-Etapa ultima` con el script corregido. El log `logs/fase4_ultima_2026-10-30_1026.log` muestra `ultima\local` y `ultima\demo` como `<JUNCTION>` hacia `corridas\2026-10-30_0932\local` y `\demo`. Captura: `fase4/script/2026-10-30_1026_ultima-junctions-dir.png`. El punto 1 de la revisión (evidencia por corrida) queda comprobado en la parte de `ultima`; la carpeta nueva en `corridas` se comprueba en la próxima corrida final.

## PR02 — Presentación JMeter & BlazeMeter (30/10/2026, 10:31–11:00)

**Base:** la Fase 2, con el reporte HTML de la corrida 2 (`jmeter/resultados/2026-10-28_2131_carga`), el `.jtl`, la evidencia de `evidencias/fase2` y el defecto G4QA-22. Se confirmó antes que el campo Severidad ya estaba en Jira: G4QA-22 = S3 Menor y G4QA-23 = S4 Incidental.

**Estilo:** el mismo de la presentación del EX01, con fondo azul oscuro, tarjetas, fuente Bahnschrift y un color por expositor (Santiago celeste, Andrés amarillo, Ignacio verde).

**Archivos nuevos:**
- `PR02_presentacion/PR02_JMeter_BlazeMeter_Grupo4.pptx`: 18 diapositivas con notas del orador. El gráfico de la diapositiva 13 es un gráfico nativo de PowerPoint hecho con los datos del `.jtl`, agrupados cada 5 s (`fuente/serie5s.json`). El script que arma la presentación está en `fuente/build.js`.
- `PR02_presentacion/PR02_notas_del_orador.md`: reparto, tiempos (24:15 en total) y glosario para Andrés e Ignacio.
- `PR02_presentacion/PR02_guion_demo.md`: la demo paso a paso (plan en JMeter, prueba de humo en vivo y reporte de la corrida 2), qué hacer si falla y cómo grabar el video del plan B.
- `PR02_presentacion/PR02_lista_verificacion_4-11.md` y `PR02_presentacion/PR02_preguntas_probables.md` (12 preguntas y una pregunta trampa).
- `jmeter/G4_demo_humo_gui.jmx`: copia del plan de carga con 1 usuario y 1 vuelta por defecto, más los listeners "Ver arbol de resultados" y "Reporte resumen" para mostrar en vivo. El plan original no se modificó.
- `scripts/pr02_demo.ps1`: revisa Docker, enciende los contenedores con `docker compose start` (o `up -d` si no existen), espera que `localhost:8200` responda 200, revisa los archivos y abre JMeter con el plan de la demo y el reporte. Tiene dos opciones: `-Humo`, que corre la prueba de humo por consola, y `-Reporte5s`, que regenera el reporte de la corrida 2 con gráficas cada 5 s.

**Prueba del script (10:36):** Docker y OrangeHRM estaban bien y la prueba de humo por consola dio 10 muestras con 0 % de error, pero el reporte no se generó: JMeter intentó crear su carpeta temporal en `C:\Windows\System32` porque PowerShell estaba ahí. Se corrigió agregando `Set-Location` a la carpeta `jmeter` antes de correr. Falta volver a correr `-Humo` para confirmarlo.

**Ensayo de la demo en la GUI (10:41):** la prueba de humo con `G4_demo_humo_gui.jmx` dio 14 muestras, 0 % de error y todo en verde. Hay capturas.

**Granularidad del reporte:** el reporte de la corrida 2 agrupa las gráficas por minuto (valor por defecto de `jmeter.reportgenerator.overall_granularity` = 60000). Por eso "Active Threads Over Time" muestra solo 3 puntos y el máximo en 49. La diapositiva 11 lo aclara y la 13 muestra el detalle cada 5 s. Si se corre `pr02_demo.ps1 -Reporte5s`, se pueden reemplazar las dos capturas por las del reporte cada 5 s.

**Bibliografía verificada** (abriendo cada URL el 30/10): manual de JMeter (página principal, Generating Dashboard Report y Component Reference), la página de la extensión de Chrome de BlazeMeter, el programa CTFL v4.0.1 (2024) y el de Performance Testing (2018) de ISTQB, y el repositorio de OrangeHRM en GitHub y su imagen en Docker Hub. El título del programa de rendimiento de ISTQB es "Certified Tester Foundation Level Specialist Syllabus – Performance Testing", versión 2018.

**Observaciones:**
- La descripción de G4QA-22 en Jira dice "Severidad: S3 – Media", pero el campo dice "S3 Menor" y la Estrategia del EX01 llama "Menor" a S3. En la diapositiva 14 se ven las dos cosas. Conviene corregir la descripción, con captura antes y después.
- El `.jmx` y el YAML de BlazeMeter guardan en texto la contraseña del Admin de la instancia local. Antes de subirlos a GitHub (Fase 5) hay que pasarla por `-Jclave` y quitarla del YAML.
- `PR02_presentacion/_trabajo/insumos.tar` (10 MB) fue una copia temporal para trabajar en la nube. Se puede borrar.

**Pendiente:** las 3 capturas de DevTools. Claude las toma mirando la pantalla mientras Santiago hace los clics. Mientras tanto, la diapositiva 8 tiene un recuadro "CAPTURA PENDIENTE".



## PR02 — Corrección: capturas de DevTools y todas las herramientas del EX01 (30/10/2026, 11:05–12:00)

**Capturas de DevTools (11:07–11:44):** Docker Desktop con los dos contenedores en Running, luego Santiago siguió los pasos en Chrome incógnito y Claude capturó: el token CSRF en el HTML del login, el POST /auth/validate (302 → /dashboard/index) y las 7 APIs del Dashboard. Contraseña y cookie tapadas con recuadro sólido antes de guardar. El primer `validate` fue un intento con la contraseña equivocada; no se usó. Detalle en el índice.

**Herramientas del EX01:** según la Estrategia (tabla de software e infraestructura) son 10: Jira, plantillas Excel del curso, Playwright, JMeter y BlazeMeter, GitHub Actions (opcional), Chrome/Firefox/Edge, DevTools, Docker con la imagen orangehrm/orangehrm y el repositorio de GitHub. No falta ni sobra ninguna respecto al contexto. Estado al 30/10: 7 en uso con captura, GitHub y Actions en curso, plantillas Excel programadas (Anexo B: ciclos 1–2 Ignacio 9–11/11, ciclo 3 Andrés 11–12/11, ciclo 4 Santiago 12–13/11).

**Presentación versión 2** (`PR02_presentacion/PR02_JMeter_BlazeMeter_Grupo4.pptx`, 20 diapositivas). La versión 1 y los .md anteriores quedaron en `PR02_presentacion/versiones/`.
- Diapositiva 8: las capturas reales del token y del POST en lugar del recuadro pendiente. Diapositiva 9: las 7 APIs.
- Nuevas: 17 "Playwright: regresión del ciclo 4" (96 / 90 / 6 / 0, reportes local y demo, pasos de CP-016) y 18 "Todas las herramientas del EX01: compromiso → evidencia" (10 tarjetas con miniatura y estado).
- Portada: los nombres van en tres líneas y ya no chocan con la tarjeta de 50 usuarios. Demo: la captura de la prueba de humo se amplió (columnas Label, Samples, Average y Error %).
- Tiempos: 23:10 de exposición (unos 24 min con los cambios). Se recortaron la agenda (0:15), tipos de prueba (0:45) y lecciones (0:30, ahora Ignacio). Reparto: Santiago 8:30, Andrés 7:55, Ignacio 6:45.
- Números revisados contra el reporte y el `.jtl`: 10 500 peticiones, 73,22/s, 0,44 %, 143,51 s, login P90 2,42 s y P95 3,58 s, Dashboard P90 1,94 s y P95 3,30 s, APDEX 0,990/0,939/0,973, 46 errores, máximo 7,089 s, validate-0 1,351 s, 28 contra 50 usuarios. **Corregidos:** "6,1 %" → "6,13 %" (46 de 750 logins) en la diapositiva 14 y sus notas; "entre el segundo 30 y el 50" → "entre el segundo 31 y el 52" (primer error 31,7 s, último 52,0 s) en la 13, sus notas y la pregunta 9; "después del segundo 55" → "después del segundo 52".
- Bibliografía: se agregaron Playwright (Microsoft, 2026), Docker Compose (Docker Inc., 2026, 28 de mayo), GitHub Actions (GitHub, Inc., 2026) y Jira Cloud (Atlassian, 2026), abriendo cada URL el 30/10. Quedan 12 referencias en orden alfabético.
- Preguntas: nuevas la 13 ("¿De verdad usaron todas las herramientas?", 30 s), la 14 (CP-011 (d)) y la 15 (para qué DevTools). Notas del orador, guion y lista de verificación actualizados.

**GitHub y GitHub Actions, decisión:** se dejan preparados para que Santiago los suba antes del 3/11; mientras no estén en GitHub figuran "En curso" (límite: antes del 11/11, Fase 5). Archivos nuevos: `.gitignore` (deja fuera `.env`, `playwright/auth/`, `CONTEXTO_PROYECTO.md`, el YAML de BlazeMeter, logs, evidencias y resultados), `.github/workflows/playwright.yml` (en cada push a main corre la regresión @regresion en Chromium contra la demo pública, con el usuario y la contraseña como secretos; se espera 15 de 16 en verde por G4QA-23), `README.md`, `docker/.env.example` y `scripts/preparar_repo.ps1` (saca las claves de MariaDB del docker-compose a `docker\.env`, revisa que ninguna clave real esté en los archivos a subir y si encuentra una se detiene, luego hace commit y push).

**Claves fuera del código:** los dos `.jmx` ya no traen la contraseña por defecto (`${__P(clave,)}`); `fase2_jmeter.ps1` y `pr02_demo.ps1` la leen de `LOCAL_ADMIN_PASS` en `playwright\.env` y la pasan con `-Jclave`. Hay que volver a correr `pr02_demo.ps1 -Humo` para confirmar.

**Nota:** la carpeta `.github` no se puede escribir desde la nube, así que el workflow quedó en `scripts/workflow_playwright.yml` y `preparar_repo.ps1` lo copia a `.github/workflows/playwright.yml` antes del commit.


## Preparación del repositorio de GitHub (30/10/2026, 11:55)

Santiago corrió `preparar_repo.ps1` (todavía sin repo creado). Funcionó lo previsto: pasó las claves de MariaDB de `docker-compose.yml` a `docker\.env`, copió el workflow y creó el repositorio local. La revisión de claves **se detuvo** porque `BITACORA.md` tenía escritas la contraseña del Admin local y las de la base de datos (tabla de la Fase 0). No se subió nada.

Arreglo: en la bitácora esas celdas ahora dicen en qué variable está cada clave (`LOCAL_ADMIN_PASS` en `playwright\.env`, `MARIADB_*` en `docker\.env`), sin el valor. Además el script ahora vacía el índice de git antes de `git add -A`, para que lo que esté en `.gitignore` no se quede agregado de una corrida anterior.
