# Kit de ejecución (ciclos 1, 2 y 3) · cómo usarlo

Lo preparó Claude el 30/10/2026 a partir del Plan del EX01: casos de la sección 3, Tabla 7 (casos por ciclo), orden de ejecución y Anexo B.

## Qué hay aquí

| Archivo | Para quién | Qué es |
|---|---|---|
| `Kit_Ciclos1y2_Ignacio.pdf` | Ignacio | 25 páginas: preparación, cómo capturar, "si algo falla", una página por caso (4 del ciclo 1 y 18 del ciclo 2) y la entrega |
| `Kit_Ciclo3_Andres.pdf` | Andrés | Lo mismo para los 9 casos del ciclo 3 |
| `Registro_casos_Ciclos1y2_Ignacio.xlsx` | Ignacio | Plantilla del curso "3-Registro de casos de prueba", con una hoja por caso y por ciclo (`C2 CP-010`…). Ya tiene título, prioridad, IDs, fecha planificada, descripción, dependencias, condiciones, pasos, esperado y nombre de cada captura. Ignacio llena solo los resultados actuales, PASS/FAIL, el bug asociado, la fecha de ejecución y el estado |
| `Registro_casos_Ciclo3_Andres.xlsx` | Andrés | Lo mismo para el ciclo 3 |
| `Guia_Jira_G4QA.pdf` | Los dos | Una página con capturas: cómo comentar el resultado en la historia y cómo registrar un defecto (tipo Error, Severidad, Prioridad, vínculo a la HU, adjunto) |
| `archivos_CP-022\` | Andrés | `G4-CV-Prueba.pdf` (CV ficticio) y `G4-archivo-no-permitido.png` (formato que el CV no acepta) |
| `capturas_esperadas.json` | Script | Las 94 capturas esperadas (nombre, caso y qué tiene que verse). Lo usa `revisar_evidencias.ps1` |
| `datos\` | Ellos, por chat | Aquí deja el script la hoja de datos de cada día |
| `img_jira\` | — | Capturas de Jira que se usaron en la guía (30/10; solo se abrió el formulario, no se creó nada) |

## Cada mañana de un ciclo

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\SantiagoMontero\Universidad\Calidad de Software\06_PRUEBAS_REALES\scripts\preparar_datos_ciclo.ps1" -Ciclo 2 -Limpiar
```

- 9/11: `-Ciclo 2 -Limpiar`.
- 10/11 y 11/11: `-Ciclo 2 -Base`.
- 11/11 y 12/11: `-Ciclo 3`.
- **El 11/11 no uses `-Limpiar`:** Ignacio sigue usando G4-Ana.
- Al final del 12/11, si quieres: `-Ciclo limpiar`.

El script entra a la demo como Admin y crea lo que falte. Luego escribe la hoja en `kit_ejecucion\datos\datos_cicloN_<fecha>.txt`. Mándala por chat como archivo.

Si la hoja trae "PENDIENTE PARA SANTIAGO", haz eso a mano antes de mandarla. Son cosas que la API de la demo no dejó crear, y el mensaje dice exactamente dónde se crean.

El log queda en `logs\datos_cicloN_<fecha>.log`.

## Cuando te devuelvan el ZIP

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\SantiagoMontero\Universidad\Calidad de Software\06_PRUEBAS_REALES\scripts\revisar_evidencias.ps1" -Entrega "C:\Users\SantiagoMontero\Downloads\G4_Ciclos1y2_Ignacio.zip" -Ciclos 1,2
```

El script:
- Dice qué capturas faltan y cuáles traen un nombre que no corresponde.
- Copia las capturas buenas a `evidencias\fase3\cicloN\` con el nombre de la regla (`AAAA-MM-DD_HHmm_C2_CP-010_1_<qué-muestra>.png`, con la hora real de la captura).
- Copia el Excel a `evidencias\fase3\registros\`.
- Deja en `logs\indice_fase3_<fecha>.md` las filas para el índice.

Con `-SoloRevisar` no copia nada.

Después, pásale a Claude el Excel y la salida. Claude revisa los resultados contra el esperado, actualiza el índice y la bitácora, y calcula las métricas.
