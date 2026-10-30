# PR02 — Guion de la demo en vivo (4 minutos)

Expone: **Santiago**. Diapositiva 17.

## Antes de la clase (en la laptop, con internet o sin internet)

1. Correr el script de preparación. Enciende Docker y OrangeHRM, revisa que el login responda y abre JMeter con el plan de la demo y el reporte de la corrida 2:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "C:\Users\SantiagoMontero\Universidad\Calidad de Software\06_PRUEBAS_REALES\scripts\pr02_demo.ps1" -Humo
   ```

   Tiene que terminar con `===== LISTO PARA LA DEMO =====`. Si sale `REVISAR`, leer qué línea dice `[FALLA]`.
2. En JMeter (se abre solo con `G4_demo_humo_gui.jmx`):
   - Desplegar el árbol: `Usuarios concurrentes` → `01_Abrir_login` → `GET /auth/login`, y lo mismo con `02_Iniciar_sesion`.
   - Limpiar resultados viejos: menú **Run → Clear All** (o Ctrl+E).
   - Dejar seleccionado `Extraer token CSRF del login`.
3. En el navegador queda abierto el reporte de la corrida 2 (`jmeter\resultados\2026-10-28_2131_carga\reporte\index.html`). Dejar la pestaña lista en **Dashboard**.
4. Tener PowerPoint en modo presentación en la diapositiva 19 y usar Alt+Tab para pasar a JMeter y al navegador.

> El plan de la demo es una copia del plan real con 1 usuario y 1 vuelta por defecto, y con dos listeners para ver los resultados en pantalla. El plan de carga original (`G4_carga_login_dashboard.jmx`) no se toca.

## Durante la demo

**Frase de entrada (10 s):** "No vamos a correr los 50 usuarios aquí porque tarda más de dos minutos y le exige mucho al equipo. Vamos a correr la prueba de humo, que es el mismo plan con un usuario, y después abrimos el reporte de la corrida real."

### a) El plan en JMeter (1 min)

| Clic | Qué decir |
|---|---|
| `Extraer token CSRF del login` | "Este es el extractor: busca el token en el HTML del login y lo guarda en la variable token." |
| `POST /auth/validate` → pestaña Parameters | "Aquí se manda `${token}`, no un valor fijo. Eso es la correlación." |
| `Entro al Dashboard` | "Esta aserción revisa que después del login la URL sea dashboard/index." |
| `Responde en menos de 3 s` | "Y esta marca error si tarda más de 3 segundos: es el criterio de HU-20." |

En la pestaña Parameters de `POST /auth/validate` se ve `${CLAVE}`, no la contraseña. No abrir el elemento raíz del plan (`G4 - DEMO PR02...`), porque ahí aparece el valor por defecto de la contraseña de la instancia local.

### b) Prueba de humo en vivo (1 min 30 s)

| Clic | Qué decir |
|---|---|
| Triángulo verde **Start** (o Ctrl+R) | "La corro con un usuario." Tarda unos 8 segundos por las dos pausas de 2 s. |
| `Ver arbol de resultados` | "Todo en verde: abrió el login, entró, cargó las 7 APIs del Dashboard y salió." Opcional: clic en `POST /auth/validate` → pestaña Response data → mostrar que entró al Dashboard. |
| `Reporte resumen` | "14 muestras, 0 % de error. Con esto sabemos que el script funciona antes de cargar el sistema." |

### c) El reporte de la corrida 2 (1 min 30 s)

| Clic | Qué decir |
|---|---|
| Navegador → **Dashboard**: tabla APDEX | "Este es el reporte real de los 50 usuarios: APDEX total 0,990, el login 0,939." |
| Bajar a **Statistics** | "El login: 46 fallos, 6,13 %, P95 de 3,6 s." |
| Menú **Charts → Over Time** → `Active Threads Over Time` (desplegar con la flecha) | "Aquí se ve cómo suben los usuarios hasta 50." |

**Cierre (10 s):** "Eso es todo de la demo. Le paso a Andrés para la bibliografía."

## Si algo falla

| Problema | Qué hacer |
|---|---|
| JMeter no abre o el plan no carga | Pasar directo al video del plan B |
| La prueba de humo sale en rojo | Decirlo con calma ("esto también pasa en la vida real: por eso existe la prueba de humo"), abrir `Ver arbol de resultados` en la fila roja y mostrar el mensaje. Luego seguir con c) |
| OrangeHRM no responde (Docker apagado) | En PowerShell: `docker compose start` desde la carpeta `docker`, esperar 30 s. Si no, plan B |
| El proyector no muestra la laptop | Plan B desde otra computadora o desde el teléfono |

## Plan B: video de la demo completa

Grabarlo una vez antes del 4/11, con todo funcionando, siguiendo este mismo guion (a, b y c). Duración: unos 3 minutos.

**Opción recomendada: Herramienta Recortes (graba varias ventanas).**
1. Correr `pr02_demo.ps1 -Humo` y dejar JMeter y el reporte listos como arriba.
2. Presionar **Win + Shift + R**. Seleccionar con el mouse toda la pantalla y presionar **Iniciar**.
3. Hacer la demo completa: JMeter (a y b) y luego el navegador (c). Alt+Tab funciona dentro de la grabación.
4. Detener con el botón rojo de la barra de Recortes y guardar como `PR02_demo_respaldo.mp4` en `06_PRUEBAS_REALES\PR02_presentacion\`.

**Alternativa: Xbox Game Bar (Win + Alt + R).** Graba solo la ventana activa. Grabar un video con JMeter y otro con el navegador; detener cada uno con Win + Alt + R. Quedan en `Videos\Capturas`. Moverlos a la carpeta de la PR02.

Copiar el video también a una memoria USB y subirlo a OneDrive o Google Drive, para poder ponerlo desde otra computadora.
