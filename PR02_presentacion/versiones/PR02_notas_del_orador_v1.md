# PR02 — JMeter y BlazeMeter · Notas del orador

Presentación extraclase del Grupo 4 · miércoles 4/11/2026 · 5 %
Archivo: `PR02_JMeter_BlazeMeter_Grupo4.pptx` (las mismas notas están dentro de cada diapositiva, en la vista Notas de PowerPoint).

## Reparto y tiempos

| # | Diapositiva | Expone | Tiempo | Acumulado |
|---|---|---|---|---|
| 1 | Portada | Santiago | 0:30 | 0:30 |
| 2 | Agenda | Santiago | 0:30 | 1:00 |
| 3 | ¿Qué es una prueba de rendimiento? | Ignacio | 1:15 | 2:15 |
| 4 | El sistema y el criterio | Ignacio | 1:30 | 3:45 |
| 5 | No probamos carga en un sistema ajeno | Ignacio | 1:00 | 4:45 |
| 6 | BlazeMeter: grabar el recorrido | Ignacio | 1:30 | 6:15 |
| 7 | La grabación no es el script | Santiago | 1:30 | 7:45 |
| 8 | Correlación del token CSRF | Santiago | 2:00 | 9:45 |
| 9 | El plan de JMeter | Santiago | 1:15 | 11:00 |
| 10 | Primero revisamos el escenario | Andrés | 1:30 | 12:30 |
| 11 | Corrida 2: el reporte de JMeter | Andrés | 1:30 | 14:00 |
| 12 | Transacciones y APDEX | Andrés | 1:30 | 15:30 |
| 13 | ¿Cuándo fallan los logins? | Andrés | 1:30 | 17:00 |
| 14 | Veredicto: cumple parcialmente | Ignacio | 1:00 | 18:00 |
| 15 | Limitaciones y recomendaciones | Andrés | 1:00 | 19:00 |
| 16 | Lo que aprendimos | Santiago | 1:00 | 20:00 |
| 17 | Demo en vivo | Santiago | 4:00 | 24:00 |
| 18 | Bibliografía | Andrés | 0:15 | 24:15 |

| Expositor | Tiempo |
|---|---|
| Santiago | 6:45 + demo 4:00 |
| Andrés | 7:15 |
| Ignacio | 6:15 |
| **Total** | **24:15** |

- La meta es terminar entre 22 y 24 minutos. Si van atrasados, la demo se acorta saltándose la parte c) y mostrando solo la diapositiva 13.
- Cambios de expositor: Santiago → Ignacio (después de la 2) → Santiago (7) → Andrés (10) → Ignacio (14) → Andrés (15) → Santiago (16 y demo) → Andrés (18).
- Cada diapositiva tiene una etiqueta abajo a la izquierda con el nombre de quien expone.

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

### 1. Portada — Santiago (0:30)

Buenas tardes. Somos el Grupo 4: Andrés, Ignacio y yo. Hoy les contamos cómo hicimos una prueba de carga de verdad con JMeter y BlazeMeter sobre OrangeHRM 5.9, el mismo sistema que usamos en el Examen I.
El gráfico de la derecha es real: es nuestra corrida con 50 usuarios entrando al mismo tiempo. Al final de la presentación lo van a entender completo y vamos a hacer una demo en vivo.

### 2. Agenda — Santiago (0:30)

La presentación tiene cuatro partes. Ignacio explica qué es una prueba de rendimiento, el sistema y por qué no usamos la demo pública. Yo explico cómo pasamos de una grabación con BlazeMeter a un script de JMeter que funciona. Andrés presenta los resultados, el defecto que encontramos y qué haríamos distinto. Cerramos con una demo en vivo. Le paso a Ignacio.

### 3. ¿Qué es una prueba de rendimiento? — Ignacio (1:15)

Una prueba de rendimiento no revisa si el sistema hace lo correcto, sino qué tan rápido y estable responde cuando lo usan muchas personas. El programa de ISTQB de Performance Testing define varios tipos; estos son los cuatro más comunes:
- Carga: se simula la cantidad de usuarios que se espera en la realidad. Es la que hicimos: 50 usuarios.
- Estrés: se sigue subiendo hasta pasar el límite, para ver dónde y cómo se cae.
- Picos: muchos usuarios llegan de golpe y luego se van, como la hora de entrada en una empresa.
- Resistencia: una carga normal durante horas, para encontrar problemas que aparecen con el tiempo, como fugas de memoria.
Cada gráfico es la forma de la carga: usuarios hacia arriba, tiempo hacia la derecha. El nuestro es el primero: sube en 30 segundos y se queda en 50.

### 4. El sistema y el criterio — Ignacio (1:30)

El sistema es OrangeHRM 5.9, un sistema de recursos humanos de código abierto. En el Examen I lo planteamos para un cliente ficticio, Grupo Alfa Servicios.
La historia HU-20 dice que el Dashboard, la pantalla principal después del login, tiene que cargar en menos de 3 segundos con 50 usuarios al mismo tiempo. Ese es el criterio que vamos a medir.
¿Por qué 50 al mismo tiempo? Porque es el momento crítico: la hora de entrada, cuando todos inician sesión casi a la vez.

### 5. No probamos carga en un sistema ajeno — Ignacio (1:00)

Una decisión importante: no lanzamos la carga contra la demo pública de OrangeHRM. Esa demo la usan muchas personas al mismo tiempo, y 50 usuarios virtuales la pueden poner lenta para todos. Además, los resultados no serían confiables porque no sabemos quién más la está usando.
Lo que hicimos fue montar nuestra propia copia con Docker, con la misma versión 5.9. Docker crea dos contenedores: uno con OrangeHRM y otro con la base de datos MariaDB. Así la prueba es ética y los números son nuestros.

### 6. BlazeMeter: grabar el recorrido — Ignacio (1:30)

BlazeMeter es una plataforma de pruebas de rendimiento. Su extensión gratuita para Chrome graba lo que uno hace en el navegador y lo convierte en un script.
Santiago abrió Chrome, le dio grabar, inició sesión en OrangeHRM local y esperó a que cargara el Dashboard. La extensión anotó cada petición que el navegador mandó al servidor.
Al final se exporta: nosotros lo bajamos en formato YAML, que trae una parte para JMeter y otra para Selenium.
La pregunta es: ¿ese archivo ya sirve para la prueba de carga? La respuesta corta es no, y Santiago les explica por qué.

### 7. La grabación no es el script — Santiago (1:30)

Este es el archivo que exportó BlazeMeter. Encontramos cinco problemas:
1. El token de seguridad quedó fijo. OrangeHRM genera uno nuevo cada vez que se abre el login, así que este ya no sirve. Lo resolvimos con correlación; lo explico en la siguiente diapositiva.
2. Chrome hizo una petición a google.com por su cuenta. Si la dejábamos, estaríamos midiendo a Google. Se quitó.
3. BlazeMeter trae su configuración por defecto: 20 usuarios durante 19 minutos. Nosotros necesitamos 50, con una rampa de 30 segundos y 15 vueltas.
4. No valida nada: si el login fallara, la petición igual contaría como exitosa. Agregamos aserciones y un límite de 3 segundos.
5. Grabó mis pausas reales, 36 segundos escribiendo la contraseña. Las cambiamos por pausas fijas de 2 segundos.
Conclusión: la grabación sirve para descubrir el flujo; el script de carga se construye a partir de ella.

### 8. Correlación del token CSRF — Santiago (2:00)

CSRF es un ataque en el que otro sitio manda formularios a nombre del usuario. Para evitarlo, OrangeHRM mete un token aleatorio en la página de login, y el login solo se acepta si se devuelve ese mismo token.
Con DevTools, en la pestaña Red, vimos que el token viene dentro del HTML de /auth/login, en un atributo :token del componente de login.
Correlación es tomar un dato dinámico de una respuesta y usarlo en la siguiente petición. En JMeter se hace con un Regular Expression Extractor: esta expresión busca lo que está entre las comillas del token y lo guarda en la variable token. Después el POST /auth/validate manda ${token} en vez del valor fijo.
Sin esto, los 50 usuarios fallarían el login desde el primer intento.

### 9. El plan de JMeter — Santiago (1:15)

A la izquierda está el árbol real del plan. Cada pieza tiene una función:
- El Thread Group define cuántos usuarios virtuales hay: 50, que arrancan en 30 segundos y dan 15 vueltas cada uno.
- Los samplers son las peticiones: abrir el login, validar, las 7 APIs del Dashboard y cerrar sesión. Están agrupados en 4 transacciones, 01 a 04, para medir cada paso del usuario.
- El extractor que ya vimos.
- Las aserciones revisan que de verdad entró al Dashboard y que respondió en menos de 3 segundos. Si no, cuenta como error.
- El Cookie Manager le da a cada usuario su propia sesión, como si fueran 50 navegadores distintos.
- Las pausas de 2 segundos imitan a una persona.
- Y al final JMeter genera un reporte HTML con todas las gráficas.
Todo corre en modo consola con un script de PowerShell: primero una prueba de humo con 1 usuario y, solo si pasa, la carga.

### 10. Primero revisamos el escenario — Andrés (1:30)

Antes de mirar tiempos, revisamos si la prueba hizo lo que tenía que hacer.
En la primera corrida cada usuario daba 3 vueltas. Salió todo en verde, 0 % de error. Pero al revisar los datos vimos que como máximo hubo 28 usuarios activos al mismo tiempo: los primeros terminaban sus 3 vueltas, unos 16 segundos, antes de que la rampa de 30 segundos terminara de arrancar a los últimos. O sea, no estábamos probando 50 simultáneos.
La corregimos a 15 vueltas: cada usuario dura unos 80 segundos, así que entre el segundo 30 y el 80 están los 50 a la vez. La segunda corrida sí cumplió el escenario.
La lección: un resultado en verde no sirve si el escenario está mal.

### 11. Corrida 2: el reporte de JMeter — Andrés (1:30)

Estas dos gráficas salen directo del reporte HTML que genera JMeter.
A la derecha, los usuarios activos: suben durante la rampa, se quedan en 50 y bajan cuando cada uno termina sus 15 vueltas. Ojo: este reporte agrupa los datos por minuto, por eso la curva se ve con pocos puntos y el máximo aparece en 49. El detalle cada 5 segundos lo mostramos en la diapositiva 13.
A la izquierda, el tiempo promedio de cada transacción. Las dos que más tardan son el login (02) y el Dashboard (03). Fíjense que los tiempos más altos aparecen justo cuando se llega a 50 usuarios.
En total fueron 10 500 peticiones en 143 segundos, unas 73 por segundo, y solo 0,44 % de error. Parece muy bien, pero en la siguiente diapositiva vemos dónde están esos errores.

### 12. Transacciones y APDEX — Andrés (1:30)

Esta es la tabla Statistics del reporte, solo con las 4 transacciones.
- Abrir el login y cerrar sesión son rápidos y sin errores.
- El login (02) tiene promedio de 1,6 s, pero el percentil 95 es 3,6 s: o sea, el 5 % más lento pasó el límite. Ahí están los 46 fallos, el 6,13 %.
- El Dashboard (03) promedia 1,4 s, pero su percentil 95 es 3,3 s.
El APDEX es un índice de satisfacción de 0 a 1. Lo configuramos así: hasta 3 s el usuario está satisfecho, hasta 6 s lo tolera y más de 6 s se frustra. 1 sería perfecto. El total da 0,990, pero el login baja a 0,939 y el Dashboard a 0,973.
El percentil 95 significa que el 95 % de las peticiones tardaron eso o menos.

### 13. ¿Cuándo fallan los logins? — Andrés (1:30)

Este gráfico lo armamos con el archivo de resultados de JMeter, agrupando cada 5 segundos. Las barras son los usuarios activos; la línea roja es el login más lento de cada tramo, la celeste el promedio y la amarilla el límite de 3 s.
Los 46 errores están todos entre el segundo 30 y el 50: justo cuando termina la rampa y los 50 usuarios hacen login casi al mismo tiempo. Ahí el login llegó a 7,1 s.
Después del segundo 55, con los mismos 50 usuarios activos, el sistema se estabiliza y el login no pasa de 3 s.
Todos los errores son por tiempo: el login funcionó, entró al Dashboard, pero tardó más de 3 s.
Dentro del login, la parte lenta es la validación en el servidor, POST /auth/validate-0, con 1,35 s promedio. Nuestra hipótesis, todavía sin confirmar, es que validar la contraseña y crear la sesión consume CPU y los logins simultáneos hacen fila.

### 14. Veredicto: cumple parcialmente — Ignacio (1:00)

Con esos datos, el veredicto contra el criterio de HU-20 es: cumple parcialmente.
- El promedio del Dashboard, 1,4 s, y el percentil 90, 1,9 s, cumplen.
- El percentil 95, 3,3 s, no cumple, y el 6,1 % de los logins pasó de 3 s.
En otras palabras: con 50 usuarios ya trabajando, el sistema responde bien; el problema es el pico de entrada, cuando todos inician sesión a la vez.
Lo registramos en Jira como el defecto G4QA-22, con severidad S3 (menor: el login funciona, pero lento) y prioridad media, vinculado a las historias HU-01 y HU-20. Tiene los pasos para reproducirlo, los datos y la evidencia.

### 15. Limitaciones y recomendaciones — Andrés (1:00)

Hay que ser honestos con el ambiente: JMeter, Docker, OrangeHRM y la base de datos corrieron en la misma laptop. El generador de carga también consume CPU y memoria, así que parte de la lentitud podría ser nuestra y no de OrangeHRM.
Por eso no lo damos por confirmado. Recomendamos tres cosas:
1. Repetir la prueba con JMeter en otra computadora.
2. Medir CPU y memoria de los contenedores con docker stats mientras corre.
3. Hacer una prueba de picos controlada: 10, 25 y 50 logins al mismo tiempo, para saber desde cuántos usuarios se pasa de 3 s.

### 16. Lo que aprendimos — Santiago (1:00)

Cuatro cosas que nos llevamos:
1. Grabar no es lo mismo que tener un script. BlazeMeter ahorra tiempo para descubrir el flujo, pero el script de carga hay que construirlo: correlación, parámetros y validaciones.
2. Hay que verificar el escenario con datos. La primera corrida salió perfecta y estaba mal planteada.
3. Encontrar un fallo es el objetivo de probar. Un reporte todo en verde no dice mucho; G4QA-22 sí aporta.
4. Ética y honestidad: no cargamos un sistema ajeno y decimos claramente las limitaciones de nuestro ambiente.
Ahora vamos a la demo.

### 17. Demo en vivo — Santiago (4:00)

a) JMeter abierto con G4_demo_humo_gui.jmx: mostrar el árbol, el extractor y las dos aserciones del login (≈1 min).
b) Darle Run (triángulo verde). Mostrar "Ver árbol de resultados" en verde y el "Reporte resumen": 14 muestras, 0 % de error (≈1 min 30 s).
c) Pasar al navegador con el reporte HTML de la corrida 2: Dashboard (APDEX y Statistics) y Charts > Over Time (≈1 min 30 s).
Frase para abrir: "No vamos a correr los 50 usuarios aquí porque tarda más de dos minutos y le exige mucho al equipo; corremos la prueba de humo, que es el mismo plan con un usuario, y después abrimos el reporte de la corrida real."
Si algo falla: decirlo con calma y poner el video del plan B.

### 18. Bibliografía — Andrés (0:15)

Estas son las fuentes que usamos, en formato APA 7: la documentación oficial de JMeter y de BlazeMeter, los programas de ISTQB de nivel básico y de pruebas de rendimiento, y la documentación de OrangeHRM. Muchas gracias; quedamos atentos a sus preguntas.

