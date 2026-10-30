# Grupo 4 · Pruebas de OrangeHRM 5.9

Scripts de pruebas del Grupo 4 para BISI07 Calidad del Software (Universidad Latina de Costa Rica): regresión automatizada con Playwright, prueba de carga con JMeter y la instancia local de OrangeHRM en Docker.

Integrantes: Santiago Montero Sancho, Andrés Rojas Oviedo e Ignacio Jiménez Sánchez.

## Qué hay aquí

| Carpeta | Contenido |
|---|---|
| `playwright/` | Regresión del ciclo 4 (CP-002, 008, 010, 011, 012, 015, 016 y 017) en Chromium, Firefox y Edge, contra la instancia local o la demo pública |
| `jmeter/` | Plan de carga de 50 usuarios sobre login y Dashboard (`G4_carga_login_dashboard.jmx`) y la copia de 1 usuario para la demo de la PR02 |
| `docker/` | OrangeHRM 5.9 + MariaDB 10.11 para la prueba de carga local |
| `scripts/` | Scripts de PowerShell de cada fase |
| `jira/` | Historias de usuario y texto del defecto de rendimiento |
| `.github/workflows/` | GitHub Actions: corre Playwright contra la demo pública en cada push a `main` |

## Credenciales

Ninguna clave está en el código.

- Playwright: copiar `playwright/.env.example` a `playwright/.env` y llenarlo. En GitHub Actions se usan los secretos `DEMO_ADMIN_USER` y `DEMO_ADMIN_PASS`.
- JMeter: la clave se pasa con `-Jclave=...`. Los scripts la leen de `playwright/.env` (`LOCAL_ADMIN_PASS`).
- Docker: copiar `docker/.env.example` a `docker/.env` y llenarlo.

## Cómo correr

```powershell
# Regresión completa por etapas (local y demo, 3 navegadores)
powershell -ExecutionPolicy Bypass -File .\scripts\fase4_playwright.ps1

# Prueba de humo y carga con JMeter (instancia local)
powershell -ExecutionPolicy Bypass -File .\scripts\fase2_jmeter.ps1
```

## Estado conocido

CP-011 (d) falla a propósito: OrangeHRM acepta `<` y `>` en el nombre sin mensaje de validación (defecto G4QA-23 en Jira). Se mantiene así hasta la revisión de historias con el PO (tarea G4QA-24).

La carga se corre solo contra la instancia local: la demo pública es un sitio de terceros y no se le lanza carga.
