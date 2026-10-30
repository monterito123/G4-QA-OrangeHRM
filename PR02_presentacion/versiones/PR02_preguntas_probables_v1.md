# PR02 — Preguntas probables del profesor

Respuestas cortas, con el dato que las respalda. Cualquiera del grupo debería poder contestarlas.

**1. ¿Por qué no usaron la demo pública de OrangeHRM?**
Porque es un sistema de un tercero que comparten muchas personas. 50 usuarios virtuales la pueden poner lenta para todos, y además los resultados no serían confiables porque no sabemos quién más la está usando. Montamos una copia propia en Docker con la misma versión, la 5.9.

**2. ¿Qué es la correlación?**
Tomar un dato que cambia en cada respuesta y usarlo en la siguiente petición. En OrangeHRM el login trae un token CSRF nuevo cada vez. Lo sacamos del HTML con un Regular Expression Extractor (`:token="&quot;(.+?)&quot;"`) y lo mandamos como `${token}` en el POST /auth/validate. Sin eso, todos los logins fallan.

**3. ¿Por qué 15 iteraciones?**
Porque con 3 vueltas cada usuario terminaba en unos 16 segundos, antes de que la rampa de 30 s arrancara a los últimos: como máximo hubo 28 usuarios a la vez. Con 15 vueltas cada usuario dura unos 80 s, así que entre el segundo 30 y el 80 están los 50 al mismo tiempo. Lo verificamos con la columna de usuarios activos del archivo de resultados.

**4. ¿Cómo saben que el problema es de OrangeHRM y no de la laptop?**
Todavía no lo sabemos con certeza, y por eso lo decimos en la presentación. JMeter, Docker y OrangeHRM corrieron en la misma laptop. Hay dos indicios a favor de OrangeHRM: la parte lenta es la validación en el servidor (POST /auth/validate-0, 1,35 s promedio) y, con los mismos 50 usuarios ya trabajando, el sistema se estabiliza por debajo de 3 s. Para confirmarlo hay que repetir la prueba con JMeter en otra computadora y medir CPU y memoria con `docker stats`.

**5. ¿Cuál es la diferencia entre BlazeMeter y JMeter?**
JMeter es la herramienta de código abierto que genera la carga y mide. BlazeMeter es una plataforma comercial; nosotros usamos su extensión gratuita de Chrome para grabar el recorrido y exportarlo. La grabación nos dio el flujo de peticiones; el script de carga lo terminamos en JMeter.

**6. ¿Qué es APDEX?**
Un índice de satisfacción del usuario entre 0 y 1. Cada respuesta se clasifica como satisfecha (hasta 3 s, el límite del plan), tolerable (hasta 6 s) o frustrada (más de 6 s). Fórmula: (satisfechas + tolerables / 2) / total. Nos dio 0,990 en total, 0,939 en el login y 0,973 en el Dashboard.

**7. Si el error total es solo 0,44 %, ¿por qué dicen que no cumple?**
Porque el criterio se mide sobre el Dashboard y el login, no sobre el total. El total incluye 10 500 peticiones y casi todas son rápidas. En el login, el 6,13 % pasó de 3 s y el percentil 95 del Dashboard es 3,3 s. Por eso el veredicto es "cumple parcialmente".

**8. ¿Qué significa el percentil 95?**
Que el 95 % de las peticiones tardaron eso o menos. Es más honesto que el promedio porque muestra lo que viven los usuarios más afectados. El login tuvo promedio de 1,6 s, pero P95 de 3,6 s.

**9. ¿Esos 46 errores son fallas del login?**
No funcionales. El login respondió bien (código 200 y entró al Dashboard), pero tardó más de 3 s, y la aserción de duración los marcó como error. Todos ocurrieron entre el segundo 30 y el 50, cuando los 50 usuarios hicieron login casi a la vez.

**10. ¿Qué tipo de prueba hicieron: carga, estrés o picos?**
Carga: simulamos la cantidad de usuarios esperada (50) y la mantuvimos. El momento de la rampa se parece a un pico, y por eso recomendamos una prueba de picos controlada (10, 25 y 50 logins al mismo tiempo).

**11. ¿Por qué JMeter en modo consola y no con la interfaz?**
Porque la interfaz gráfica consume memoria y CPU y distorsiona la medición. El manual de JMeter lo dice así: "GUI mode should only be used for creating the test script, CLI mode (NON GUI) must be used for load testing" (Getting Started, sección 1.4). La carga se corrió en modo consola con un script de PowerShell, y la interfaz solo se usa en la demo con 1 usuario.

**12. ¿Qué hicieron con el resultado?**
Lo registramos en Jira como el defecto G4QA-22: severidad S3 (menor: funciona, pero lento), prioridad media, con pasos para reproducirlo, datos, evidencia y la nota del ambiente. Está vinculado a las historias HU-01 (login) y HU-20 (Dashboard).

**Pregunta trampa: "¿Entonces OrangeHRM no sirve para 50 usuarios?"**
Sí sirve: en régimen estable responde dentro del límite. El problema aparece solo cuando los 50 inician sesión al mismo tiempo, y aún falta descartar el efecto del ambiente. Lo correcto es decir lo que medimos y lo que falta confirmar.
