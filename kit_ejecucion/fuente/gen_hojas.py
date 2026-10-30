import base64, json, os, re, sys
sys.path.insert(0, '.')
from gen_kit import CSS, pdf
N = json.load(open('/home/claude/pr02/notas.json'))
PREG = open('/mnt/user-data/outputs/06_PRUEBAS_REALES/PR02_presentacion/PR02_preguntas_probables.md', encoding='utf-8').read()
TIT = {3: '¿Qué es una prueba de rendimiento?', 4: 'El sistema y el criterio', 5: 'No probamos carga en un sistema ajeno', 6: 'BlazeMeter: grabar el recorrido',
       10: 'Primero revisamos el escenario', 11: 'Corrida 2: el reporte de JMeter', 12: 'Transacciones y APDEX', 13: '¿Cuándo fallan los logins?',
       14: 'Veredicto: cumple parcialmente', 15: 'Limitaciones y recomendaciones', 16: 'Lo que aprendimos', 17: 'Playwright: regresión del ciclo 4',
       18: 'Todas las herramientas del EX01', 20: 'Bibliografía'}

def pregunta(clave):
    m = re.search(r'\*\*' + re.escape(clave) + r'(.*?)\*\*(.*?)\n(.*?)(?=\n\n|\Z)', PREG, re.S)
    return m.group(1).strip(), m.group(3).strip()

def img(n):
    return 'data:image/jpeg;base64,' + base64.b64encode(open('/home/claude/pr02/sl-%02d.jpg' % n, 'rb').read()).decode()

def hoja(nombre, color, diapos, entra, sale, preguntas, archivo):
    total = 0
    filas = ''
    for d in diapos:
        cab, texto = N[str(d)].split('\n', 1)
        t = re.search(r'\((.*?)\)', cab).group(1)
        m = re.match(r'(?:(\d+) min)? ?(?:(\d+) s)?', t)
        total += int(m.group(1) or 0) * 60 + int(m.group(2) or 0)
        filas += '<tr><td style="width:44mm"><img src="%s" style="width:42mm;border:1px solid #c9d1de"><br><b>%d. %s</b><br>%s</td><td>%s</td></tr>' % (
            img(d), d, TIT[d], t, texto.replace('\n', '<br>').replace('\\$', '$'))
    ps = ''
    for clave in preguntas:
        q, r = pregunta(clave)
        ps += '<p style="margin:1.5mm 0"><b>%s %s</b><br>%s</p>' % (clave, q, r.replace('`', ''))
    body = '''<div class="pag denso">
<h1 style="color:#%s">PR02 · Hoja de %s</h1>
<div class="sub">Exposición del miércoles 4/11/2026 en clase · tu parte dura <b>%d:%02d</b> · el total de la presentación es de unos 24 min</div>
<div class="caja"><b>Cómo prepararte (solo):</b> lee esta hoja dos veces, abre la presentación en tu computadora y di tu parte en voz alta con cronómetro, mirando la diapositiva, no el papel. Las notas son una guía: dilas con tus palabras. <b>Entras</b> %s. <b>Al terminar</b> %s.</div>
<table><tr><th>Diapositiva y tiempo</th><th>Qué decir</th></tr>%s</table>
</div>
<div class="pag denso"><h1>Preguntas que te pueden tocar</h1>
<div class="sub">Respuestas cortas. Si te preguntan algo que no sabes: "Eso lo trabajó Santiago, él lo puede ampliar" es una respuesta válida.</div>%s</div>''' % (color, nombre, total // 60, total % 60, entra, sale, filas, ps)
    doc = '<!doctype html><html lang="es"><head><meta charset="utf-8"><style>%s</style></head><body>%s</body></html>' % (CSS, body)
    pdf(doc, archivo)
    print(nombre, total)

D = '/mnt/user-data/outputs/06_PRUEBAS_REALES/PR02_presentacion/'
hoja('Ignacio', '2f7d5b', [3, 4, 5, 6, 14, 16, 17], 'después de la agenda, cuando Santiago dice "Le paso a Ignacio" (diapositiva 3)',
     'la 6 le pasas a Santiago ("Santiago les explica por qué"); vuelves en la 14 después de Andrés, pasas a Andrés en la 15, y vuelves en la 16 y la 17; después de la 17 le pasas a Andrés para la de herramientas',
     ['1.', '5.', '10.', '12.', '14.', 'Pregunta trampa:'], D + 'PR02_hoja_Ignacio.pdf')
hoja('Andrés', '8a5f00', [10, 11, 12, 13, 15, 18, 20], 'en la diapositiva 10, después de que Santiago termina el plan de JMeter',
     'la 13 le pasas a Ignacio (veredicto); vuelves en la 15 y se la pasas a Ignacio; vuelves en la 18 (herramientas) y se la pasas a Santiago para la demo; cierras con la bibliografía (20)',
     ['3.', '4.', '6.', '7.', '8.', '9.', '13.', '13b.'], D + 'PR02_hoja_Andres.pdf')
