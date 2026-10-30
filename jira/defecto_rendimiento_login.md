# Defecto: el login supera 3 s cuando 50 usuarios inician sesión al mismo tiempo

- **Tipo:** Bug (rendimiento)
- **Severidad:** S3 – Media
- **Prioridad:** P2
- **Historia relacionada:** HU-01 (login) y HU-20 (Dashboard en 3 s o menos)
- **Ambiente:** OrangeHRM OS 5.9 local en Docker (orangehrm/orangehrm:5.9 + mariadb:10.11), Windows 11, 16 GB de RAM. JMeter 5.6.3 en la misma laptop.
- **Encontrado por:** Santiago Montero, 28/10/2026, prueba de carga `jmeter/G4_carga_login_dashboard.jmx`

## Pasos para reproducir

1. Levantar OrangeHRM local (`docker compose up -d`).
2. Correr `scripts/fase2_jmeter.ps1` (50 usuarios, rampa de 30 s, 15 iteraciones).
3. Revisar la transacción `02_Iniciar_sesion` en el reporte HTML.

## Resultado esperado

Con 50 usuarios simultáneos, el login y la carga del Dashboard responden en 3 s o menos (criterio de la Estrategia, sección de tipos de prueba).

## Resultado obtenido

- 46 de 750 logins (6.1 %) tardaron más de 3 s; máximo 7.1 s. P95 del login: 3.6 s.
- Todos ocurren entre el segundo 30 y el 50, cuando los 50 usuarios inician sesión casi a la vez.
- Después del pico, con los mismos 50 usuarios activos, el login se mantiene bajo 3 s.
- El login sí funciona (código 200 y entra al Dashboard); el fallo es solo de tiempo.

## Evidencia

- `evidencias/fase2/06_jmeter_corrida2_50_activos_aparecen_errores.jpg`
- `evidencias/fase2/09_grafico_usuarios_activos_vs_tiempo_login.png`
- `evidencias/fase2/reporte_2026-10-28_2131_carga_01_resumen_apdex_y_estadisticas.png`

## Nota

El generador de carga corrió en la misma máquina que el servidor. Antes de cerrar el defecto se recomienda repetir la prueba con JMeter en otra computadora y medir CPU/memoria de los contenedores con `docker stats`.
