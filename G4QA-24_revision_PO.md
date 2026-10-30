# G4QA-24 · Revisión con el PO (simulado): caracteres permitidos en el nombre (HU-06, CA-06.4)

Para resolver el 2 o 3/11. Santiago hace de PO, como dice el Plan (el PO es un rol simulado). Elige una opción, la comenta en Jira y Claude hace el resto.

## El problema en una línea

CA-06.4 pide rechazar los "caracteres no permitidos", pero no dice cuáles son. OrangeHRM 5.9 acepta cualquier carácter y lo muestra escapado, así que no hay XSS. Por eso CP-011 (d) falla y existe G4QA-23 (S4, Low).

## Dato que hay que tener en cuenta

Todos los datos de prueba del Plan empiezan con **"G4-"**, que tiene un **número** y un **guion** ("G4-Ana", "G4-Borrar"…). Una lista que prohíba números deja inválidos nuestros propios datos.

## Opción A · OrangeHRM debe validar (G4QA-23 sigue abierto)

- **CA-06.4 nuevo:** "Dado que el nombre, el segundo nombre o el apellido tienen un carácter fuera de la lista permitida (letras con o sin tilde, ñ, ü, números, espacio, apóstrofo ', guion - y punto .), cuando guardo, entonces el sistema muestra 'Invalid characters' bajo el campo y no guarda."
- **No permitidos (ejemplos para la prueba):** `< > " ; = & % $ # @ ! * / \ { } [ ] | ^ ~`
- **Deben aceptarse siempre:** Núñez, José, Peña, Muñoz, O'Connor, D'Angelo, Rojas-Oviedo, María José, G4-Ana.
- **Consecuencias:**
  - G4QA-23 se queda en Nuevo y es un defecto válido (cuenta para los 15 errores del EX02).
  - CP-011 (d) sigue fallando: se marca con `test.fail()` y la anotación "G4QA-23", así el ciclo 4 y GitHub Actions quedan en verde mientras el defecto siga abierto, y avisan si un día OrangeHRM lo corrige.
  - Se agregan los casos positivos (Núñez, O'Connor, Rojas-Oviedo) que deben guardarse.
  - En el ciclo 2, Ignacio marca CP-011 (d) como FAIL con G4QA-23 (ya está así en su guía).

## Opción B · El criterio se ajusta al producto (G4QA-23 se rechaza)

- **CA-06.4 nuevo:** "Dado que un campo supera la longitud máxima, cuando guardo, entonces el sistema lo rechaza con 'Should not exceed 30 characters'. Los caracteres especiales se aceptan, pero se muestran como texto (escapados) en todas las pantallas."
- **Consecuencias:**
  - G4QA-23 pasa a Rechazado ("Rechazar (inválido o duplicado)"), con el comentario de la decisión.
  - CP-011 (d) cambia: ahora verifica que "G4-<Ana>" se guarda **y** se muestra literal, sin interpretarse como HTML, y que los nombres reales (Núñez, O'Connor, Rojas-Oviedo) se guardan. Sin `test.fail()`.
  - Hay que actualizar la página de CP-011 en el kit de Ignacio y su hoja del Excel antes del 6/11.
  - Se pierde un defecto para el EX02.

## Recomendación de Claude

**Opción A.** El resultado esperado del Plan y del criterio ya dice "se rechazan con su mensaje"; lo único que faltaba era la lista. La opción A completa el criterio sin cambiar lo que se aprobó en el EX01. Además, la lista incluye números y guion, así que no rompe los datos "G4-".

Es una decisión de PO: B también es defendible si se argumenta que el producto ya protege contra XSS escapando la salida.

## Texto para pegar en G4QA-24 (según la opción)

**Si es A:**
> Revisión con el PO (simulado), <fecha>. Decisión: OrangeHRM debe validar los nombres. Permitidos: letras con o sin tilde, ñ, ü, números, espacio, apóstrofo, guion y punto. Cualquier otro carácter se rechaza con un mensaje de validación y no se guarda. CA-06.4 actualizado en G4QA-6. G4QA-23 sigue abierto (defecto válido). CP-011 (d) se marca con test.fail() mientras G4QA-23 esté abierto, y se agregan los casos positivos (Núñez, O'Connor, Rojas-Oviedo).

**Si es B:**
> Revisión con el PO (simulado), <fecha>. Decisión: los nombres aceptan caracteres especiales; el requisito es que se muestren escapados (sin interpretar HTML), y eso ya se cumple. CA-06.4 queda solo con la longitud máxima. G4QA-23 se rechaza (criterio incompleto, no es defecto del producto). CP-011 (d) se cambia a verificar el escape y los nombres reales.

## Qué hace cada uno cuando se decida

| Paso | Claude | Santiago (con sus manos) |
|---|---|---|
| 1 | — | Elegir A o B y pegar el comentario en G4QA-24 |
| 2 | Actualizar CA-06.4 en G4QA-6 (con captura antes y después) | — |
| 3 | A: dejar G4QA-23 como está y comentar la decisión. B: transición a Rechazado (con captura) | — |
| 4 | Cambiar `cp-011-empleado-invalido.spec.js` (A: `test.fail()` y positivos; B: escape y positivos) | Correr `fase4_playwright.ps1` (etapa final) para confirmar |
| 5 | B: actualizar la página de CP-011 del kit de Ignacio y su Excel | Mandar el kit actualizado |
| 6 | Pasar G4QA-24 a Listo, con captura | — |
| 7 | Aprovechar para corregir la descripción de G4QA-22 ("S3 – Media" → "S3 Menor"), con captura antes y después | — |
