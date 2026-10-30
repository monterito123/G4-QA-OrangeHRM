# PR02 — JMeter y BlazeMeter · Notas del orador

Presentación extraclase del Grupo 4 · miércoles 4/11/2026 · 5 %
Archivo: `PR02_JMeter_BlazeMeter_Grupo4.pptx` (versión 2, 30/10). Las mismas notas están dentro de cada diapositiva, en la vista Notas de PowerPoint. La versión 1 quedó en `versiones/`.

## Reparto y tiempos

| # | Diapositiva | Expone | Tiempo | Acumulado |
|---|---|---|---|---|
| 1 | Portada | Santiago | 0:20 | 0:20 |
| 2 | Agenda | Santiago | 0:15 | 0:35 |
| 3 | ¿Qué es una prueba de rendimiento? | Ignacio | 0:45 | 1:20 |
| 4 | El sistema y el criterio | Ignacio | 1:00 | 2:20 |
| 5 | No probamos carga en un sistema ajeno | Ignacio | 0:50 | 3:10 |
| 6 | BlazeMeter: grabar el recorrido | Ignacio | 1:10 | 4:20 |
| 7 | La grabación no es el script | Santiago | 1:20 | 5:40 |
| 8 | Correlación del token CSRF | Santiago | 1:50 | 7:30 |
| 9 | El plan de JMeter | Santiago | 1:00 | 8:30 |
| 10 | Primero revisamos el escenario | Andrés | 1:10 | 9:40 |
| 11 | Corrida 2: el reporte de JMeter | Andrés | 1:10 | 10:50 |
| 12 | Transacciones y APDEX | Andrés | 1:10 | 12:00 |
| 13 | ¿Cuándo fallan los logins? | Andrés | 1:20 | 13:20 |
| 14 | Veredicto: cumple parcialmente | Ignacio | 1:00 | 14:20 |
| 15 | Limitaciones y recomendaciones | Andrés | 0:50 | 15:10 |
| 16 | Lo que aprendimos | Ignacio | 0:30 | 15:40 |
| 17 | Playwright: regresión del ciclo 4 | Ignacio | 1:30 | 17:10 |
| 18 | Todas las herramientas del EX01: compromiso → evidencia | Andrés | 2:00 | 19:10 |
| 19 | Demo en vivo | Santiago | 3:45 | 22:55 |
| 20 | Bibliografía | Andrés | 0:15 | 23:10 |

| Expositor | Tiempo |
|---|---|
| Santiago | 8:30 (incluye la demo, 3:45) |
| Andrés | 7:55 |
| Ignacio | 6:45 |
| **Total** | **23:10** (con los cambios de expositor, unos 24 min) |

- Meta: entre 23 y 25 minutos. Si van atrasados, la demo se acorta saltándose la parte c) y se remite a la diapositiva 13.
- Cambios de expositor: Santiago → Ignacio (3) → Santiago (7) → Andrés (10) → Ignacio (14) → Andrés (15) → Ignacio (16 y 17) → Andrés (18) → Santiago (demo) → Andrés (20).
- Cada diapositiva tiene abajo a la izquierda el nombre de quien expone.
- La diapositiva 18 (herramientas) es la respuesta a "¿de verdad usaron todo?". Los tres tienen que poder explicarla.

## Glosario rápido (para Andrés e Ignacio, que no corrieron la Fase 2)

| Término | Qué significa aquí |
|---|---|
| Usuario virtual / hilo | Un "navegador simulado" de JMeter. 50 hilos = 50 personas usando el sistema al mismo tiempo |
| Rampa (ramp-up) | Tiempo en que arrancan todos los usuarios. 30 s = un usuario nuevo cada 0,6 s |
| Iteración / vuelta | Una pasada completa: abrir login → entrar → Dashboard → salir |
| Sampler | Cada petición HTTP que JMeter manda |
| Transacción | Un grupo de peticiones que el usuario ve como un solo paso (01 a 04) |
| Aserción | Una revisión automática: si no se cumple, la petición cuenta como error |
| Correlación | Tomar un dato que cambia (el token) de una respuesta y usarlo en la siguiente petición |
| Token CSRF | Código aleatorio que OrangeHRM pone en el login para evitar formularios falsos desde otros sitios |
| Percentil 95 (P95) | El 95 % de las peticiones tardaron eso o menos; el 5 % restante tardó más |
| APDEX | Índice de satisfacción de 0 a 1. Aquí: satisfecho hasta 3 s, tolerable hasta 6 s |
| Prueba de humo | La misma prueba con 1 usuario, para confirmar que el script funciona antes de la carga |

## Notas por diapositiva

### 1. Portada — Santiago (0:20)

Buenas tardes. Somos el Grupo 4: Andrés, Ignacio y yo. Hoy les contamos cómo hicimos una prueba de carga de verdad con JMeter y BlazeMeter sobre OrangeHRM 5.9, el mismo sistema que usamos en el Examen I.
El gráfico de la derecha es real: es nuestra corrida con 50 usuarios entrando al mismo tiempo. Al final lo van a entender completo.

### 2. Agenda — Santiago (0:15)

Cuatro partes: conceptos y contexto con Ignacio, cómo armamos el script conmigo, resultados con Andrés, y al final Playwright, la evidencia de cada herramienta del EX01 y la demo en vivo. Le paso a Ignacio.

### 3. ¿Qué es una prueba de rendimiento? — Ignacio (0:45)

Una prueba de rendimiento no revisa si el sistema hace lo correcto, sino qué tan rápido responde cuando lo usan muchas personas. ISTQB define estos cuatro tipos:
- Carga: los usuarios que se esperan. Es la nuestra, 50.
- Estrés: subir hasta pasar el límite.
- Picos: muchos de golpe y luego calma.
- Resistencia: carga normal durante horas.
El gráfico es la forma de la carga. El nuestro sube en 30 segundos y se queda en 50.

### 4. El sistema y el criterio — Ignacio (1:00)

El sistema es OrangeHRM 5.9, un sistema de recursos humanos de código abierto. En el Examen I lo planteamos para un cliente ficticio, Grupo Alfa Servicios.
La historia HU-20 dice que el Dashboard, la pantalla principal después del login, tiene que cargar en menos de 3 segundos con 50 usuarios al mismo tiempo. Ese es el criterio que vamos a medir.
¿Por qué 50 al mismo tiempo? Porque es el momento crítico: la hora de entrada, cuando todos inician sesión casi a la vez.

### 5. No probamos carga en un sistema ajeno — Ignacio (0:50)

Una decisión importante: no lanzamos la carga contra la demo pública de OrangeHRM. Esa demo la usan muchas personas al mismo tiempo, y 50 usuarios virtuales la pueden poner lenta para todos. Además, los resultados no serían confiables porque no sabemos quién más la está usando.
Lo que hicimos fue montar nuestra propia copia con Docker, con la misma versión 5.9. Docker crea dos contenedores: uno con OrangeHRM y otro con la base de datos MariaDB. Así la prueba es ética y los números son nuestros.

### 6. BlazeMeter: grabar el recorrido — Ignacio (1:10)

BlazeMeter es una plataforma de pruebas de rendimiento. Su extensión gratuita para Chrome graba lo que uno hace en el navegador y lo convierte en un script.
Santiago abrió Chrome, le dio grabar, inició sesión en OrangeHRM local y esperó a que cargara el Dashboard. La extensión anotó cada petición que el navegador mandó al servidor.
Al final se exporta: nosotros lo bajamos en formato YAML, que trae una parte para JMeter y otra para Selenium.
La pregunta es: ¿ese archivo ya sirve para la prueba de carga? La respuesta corta es no, y Santiago les explica por qué.

### 7. La grabación no es el script — Santiago (1:20)

Este es el archivo que exportó BlazeMeter. Encontramos cinco problemas:
1. El token de seguridad quedó fijo. OrangeHRM genera uno nuevo cada vez que se abre el login, así que este ya no sirve. Lo resolvimos con correlación; lo explico en la siguiente diapositiva.
2. Chrome hizo una petición a google.com por su cuenta. Si la dejábamos, estaríamos midiendo a Google. Se quitó.
3. BlazeMeter trae su configuración por defecto: 20 usuarios durante 19 minutos. Nosotros necesitamos 50, con una rampa de 30 segundos y 15 vueltas.
4. No valida nada: si el login fallara, la petición igual contaría como exitosa. Agregamos aserciones y un límite de 3 segundos.
5. Grabó mis pausas reales, 36 segundos escribiendo la contraseña. Las cambiamos por pausas fijas de 2 segundos.
Conclusión: la grabación sirve para descubrir el flujo; el script de carga se construye a partir de ella.

### 8. Correlación del token CSRF — Santiago (1:50)

CSRF es un ataque en el que otro sitio manda formularios a nombre del usuario. Para evitarlo, OrangeHRM mete un token aleatorio en la página de login, y el login solo se acepta si se devuelve ese mismo token.
Arriba a la izquierda, DevTools de Chrome, pestaña Red, la respuesta de /auth/login: el token viene en el HTML, en el atributo :token del componente de login (línea 50).
A la derecha, el POST /auth/validate: manda _token, username y password (la contraseña la tapamos). Responde 302 y el Location lo manda a /dashboard/index: así se ve un login correcto.
Correlación es tomar ese dato dinámico de una respuesta y usarlo en la siguiente petición. En JMeter lo hace el Regular Expression Extractor de abajo: guarda lo que está entre las comillas en la variable token, y el POST manda ${token} en vez del valor fijo.
Sin esto, los 50 usuarios fallarían el login desde el primer intento.
Estas capturas son del 30/10, en incógnito contra nuestra instancia local.

### 9. El plan de JMeter — Santiago (1:00)

A la izquierda está el árbol real del plan:
- Thread Group: 50 usuarios, rampa de 30 segundos y 15 vueltas cada uno.
- Samplers: login, validate, las 7 APIs del Dashboard y logout, agrupados en 4 transacciones.
- El extractor que ya vimos, y aserciones que revisan que entró al Dashboard en menos de 3 s.
- Cookie Manager para que cada usuario tenga su sesión, y pausas de 2 s.
¿De dónde salieron esas 7 APIs? Abajo: DevTools muestra que el Dashboard hace exactamente esas 7 llamadas, todas 200. Por eso el plan las pide igual que el navegador.
Todo corre en modo consola con un script de PowerShell: primero humo con 1 usuario y, si pasa, la carga.

### 10. Primero revisamos el escenario — Andrés (1:10)

Antes de mirar tiempos, revisamos si la prueba hizo lo que tenía que hacer.
En la primera corrida cada usuario daba 3 vueltas. Salió todo en verde, 0 % de error. Pero al revisar los datos vimos que como máximo hubo 28 usuarios activos al mismo tiempo: los primeros terminaban sus 3 vueltas, unos 16 segundos, antes de que la rampa de 30 segundos terminara de arrancar a los últimos. O sea, no estábamos probando 50 simultáneos.
La corregimos a 15 vueltas: cada usuario dura unos 80 segundos, así que entre el segundo 30 y el 80 están los 50 a la vez. La segunda corrida sí cumplió el escenario.
La lección: un resultado en verde no sirve si el escenario está mal.

### 11. Corrida 2: el reporte de JMeter — Andrés (1:10)

Estas dos gráficas salen directo del reporte HTML que genera JMeter.
A la derecha, los usuarios activos: suben durante la rampa, se quedan en 50 y bajan cuando cada uno termina sus 15 vueltas. Ojo: este reporte agrupa los datos por minuto, por eso la curva se ve con pocos puntos y el máximo aparece en 49. El detalle cada 5 segundos lo mostramos en la diapositiva 13.
A la izquierda, el tiempo promedio de cada transacción. Las dos que más tardan son el login (02) y el Dashboard (03). Fíjense que los tiempos más altos aparecen justo cuando se llega a 50 usuarios.
En total fueron 10 500 peticiones en 143 segundos, unas 73 por segundo, y solo 0,44 % de error. Parece muy bien, pero en la siguiente diapositiva vemos dónde están esos errores.

### 12. Transacciones y APDEX — Andrés (1:10)

Esta es la tabla Statistics del reporte, solo con las 4 transacciones.
- Abrir el login y cerrar sesión son rápidos y sin errores.
- El login (02) tiene promedio de 1,6 s, pero el percentil 95 es 3,6 s: o sea, el 5 % más lento pasó el límite. Ahí están los 46 fallos, el 6,13 %.
- El Dashboard (03) promedia 1,4 s, pero su percentil 95 es 3,3 s.
El APDEX es un índice de satisfacción de 0 a 1. Lo configuramos así: hasta 3 s el usuario está satisfecho, hasta 6 s lo tolera y más de 6 s se frustra. 1 sería perfecto. El total da 0,990, pero el login baja a 0,939 y el Dashboard a 0,973.
El percentil 95 significa que el 95 % de las peticiones tardaron eso o menos.

### 13. ¿Cuándo fallan los logins? — Andrés (1:20)

Este gráfico lo armamos con el archivo de resultados de JMeter, agrupando cada 5 segundos. Las barras son los usuarios activos; la línea roja es el login más lento de cada tramo, la celeste el promedio y la amarilla el límite de 3 s.
Los 46 errores están todos entre el segundo 31 y el 52: justo cuando termina la rampa y los 50 usuarios hacen login casi al mismo tiempo. Ahí el login llegó a 7,1 s.
Después del segundo 52, con los mismos 50 usuarios activos, el sistema se estabiliza y el login no pasa de 3 s.
Todos los errores son por tiempo: el login funcionó, entró al Dashboard, pero tardó más de 3 s.
Dentro del login, la parte lenta es la validación en el servidor, POST /auth/validate-0, con 1,35 s promedio. Nuestra hipótesis, todavía sin confirmar, es que validar la contraseña y crear la sesión consume CPU y los logins simultáneos hacen fila.

### 14. Veredicto: cumple parcialmente — Ignacio (1:00)

Con esos datos, el veredicto contra el criterio de HU-20 es: cumple parcialmente.
- El promedio del Dashboard, 1,4 s, y el percentil 90, 1,9 s, cumplen.
- El percentil 95, 3,3 s, no cumple, y el 6,13 % de los logins pasó de 3 s (46 de 750).
En otras palabras: con 50 usuarios ya trabajando, el sistema responde bien; el problema es el pico de entrada, cuando todos inician sesión a la vez.
Lo registramos en Jira como el defecto G4QA-22, con severidad S3 (menor: el login funciona, pero lento) y prioridad media, vinculado a las historias HU-01 y HU-20. Tiene los pasos para reproducirlo, los datos y la evidencia.

### 15. Limitaciones y recomendaciones — Andrés (0:50)

Hay que ser honestos con el ambiente: JMeter, Docker, OrangeHRM y la base de datos corrieron en la misma laptop. El generador de carga también consume CPU y memoria, así que parte de la lentitud podría ser nuestra y no de OrangeHRM.
Por eso no lo damos por confirmado. Recomendamos tres cosas:
1. Repetir la prueba con JMeter en otra computadora.
2. Medir CPU y memoria de los contenedores con docker stats mientras corre.
3. Hacer una prueba de picos controlada: 10, 25 y 50 logins al mismo tiempo, para saber desde cuántos usuarios se pasa de 3 s.

### 16. Lo que aprendimos — Ignacio (0:30)

Cuatro cosas en corto: la grabación es el punto de partida, no el script; el escenario se verifica con datos; un fallo bien documentado vale más que un reporte en verde; y no cargamos sistemas ajenos y decimos las limitaciones.
Y JMeter no fue lo único que usamos: en el ciclo 4 automatizamos la regresión con Playwright.

### 17. Playwright: regresión del ciclo 4 — Ignacio (1:30)

En el EX01 nos comprometimos con Playwright para la regresión del ciclo 4. Ya está corriendo.
Son 8 casos de prueba, en 3 navegadores (Chromium, Firefox y Edge) y en 2 ambientes: nuestra instancia local y la demo pública. Eso da 96 ejecuciones.
La corrida final del 30/10: 90 pasaron y 6 fallaron. Las 6 son el mismo caso, CP-011 (d): un nombre con caracteres como < y > se guarda en vez de rechazarse. Falla igual en los 3 navegadores y en los 2 ambientes, así que no es del script: es el defecto G4QA-23 en Jira. Ninguna prueba quedó inestable.
A la derecha: cada paso deja una captura. Este es CP-016, pedir un día más del saldo; abajo, la captura del paso en Firefox.
Ojo: contra la demo pública solo corremos pruebas funcionales, nunca carga.

### 18. Todas las herramientas del EX01: compromiso → evidencia — Andrés (2:00)

En el EX01 pusimos 10 herramientas en la Estrategia y el Plan. Aquí está cada una con su evidencia real; nada está en verde sin una captura.
En uso (verde), 9:
- Jira desde el 28/10: el sprint, los casos y los defectos G4QA-22 y G4QA-23.
- Docker con OrangeHRM 5.9, BlazeMeter y JMeter: el 28/10, todo lo que acabamos de mostrar.
- Playwright, el 29 y 30/10, y con él Chrome, Firefox y Edge: las 96 ejecuciones.
- DevTools: las capturas del token y del login del 30/10.
- GitHub: el repositorio monterito123/G4-QA-OrangeHRM, subido el 30/10, sin el .env ni ninguna contraseña (un script revisa eso antes de subir y la primera vez nos frenó).
- GitHub Actions, que en la Estrategia era opcional: en cada push corre la regresión en Chromium contra la demo. La primera corrida dio 15 de 16: la que falla es CP-011 (d), el mismo defecto G4QA-23. O sea, el defecto se reproduce también en la nube.
Programada (azul), 1: las plantillas de Excel del curso. Según el Anexo B del Plan se usan en la ejecución manual: Ignacio en los ciclos 1 y 2 (9 al 11/11), yo en el ciclo 3 (11 y 12/11) y Santiago en el ciclo 4 (12 y 13/11).
O sea: no pusimos herramientas de relleno. La única que falta es la que su fase todavía no llega.

### 19. Demo en vivo — Santiago (3:45)

seguir el guion de la demo (PR02_guion_demo.md)

a) JMeter abierto con G4_demo_humo_gui.jmx: mostrar el árbol, el extractor y las dos aserciones del login (≈1 min).
b) Darle Run (triángulo verde). Mostrar "Ver árbol de resultados" en verde y el "Reporte resumen": 14 muestras, 0 % de error (≈1 min 30 s).
c) Pasar al navegador con el reporte HTML de la corrida 2: Dashboard (APDEX y Statistics) y Charts > Over Time (≈1 min 30 s).
Frase para abrir: "No vamos a correr los 50 usuarios aquí porque tarda más de dos minutos y le exige mucho al equipo; corremos la prueba de humo, que es el mismo plan con un usuario, y después abrimos el reporte de la corrida real."
Si algo falla: decirlo con calma y poner el video del plan B.

### 20. Bibliografía — Andrés (0:15)

Estas son las fuentes que usamos, en formato APA 7: la documentación oficial de JMeter, BlazeMeter, Playwright, Docker, Jira y GitHub Actions, los programas de ISTQB y la documentación de OrangeHRM. Muchas gracias; quedamos atentos a sus preguntas.
