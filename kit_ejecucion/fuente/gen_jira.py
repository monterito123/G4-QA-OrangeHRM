import base64, os, sys
sys.path.insert(0, '.')
from gen_kit import CSS, pdf, SALIDA
def img(p):
    ext = 'png' if p.endswith('png') else 'jpeg'
    return 'data:image/%s;base64,%s' % (ext, base64.b64encode(open(p, 'rb').read()).decode())
J = 'jira/'
body = '''
<div class="pag denso">
<h1>Guía de Jira · proyecto G4QA</h1>
<div class="sub">Sitio: <span class="mono">santiagomonterosancho.atlassian.net</span> · entras con la invitación que te llegó al correo · solo dos cosas: comentar el resultado de cada caso y registrar defectos</div>
<div class="dos">
<div>
<h2>1. Resultado de cada caso (comentario en la historia)</h2>
<ol>
<li>Abrir la historia del caso. La clave sale en la página del caso, por ejemplo CP-010 → <b>G4QA-6</b>. Atajo: <span class="mono">santiagomonterosancho.atlassian.net/browse/G4QA-6</span></li>
<li>Bajar hasta <b>Actividad</b> y hacer clic en <b>Añadir un comentario…</b></li>
<li>Escribir una línea así y pulsar <b>Guardar</b>:<br><span class="mono">Ciclo 2 · CP-010 · PASS · 09/11/2026 · Ignacio · capturas C2_CP-010_1 a 3</span><br>Si falló: <span class="mono">… · FAIL · paso 4 · defecto G4QA-25</span></li>
</ol>
<div class="caja">No cambies el estado de las historias ni muevas tarjetas del tablero: eso lo hace Santiago.</div>
<h2>2. Registrar un defecto</h2>
<ol>
<li>Botón azul <b>+ Crear</b> (arriba). En la ventanita, pulsar el ícono de expandir (↗) para ver el formulario completo.</li>
<li>Arriba a la izquierda, cambiar el tipo a <b>Error</b> (ícono rojo).</li>
<li><b>Resumen:</b> <span class="mono">[Módulo] qué pasa (CP-0xx)</span>. Ejemplo: <span class="mono">[PIM] Add Employee acepta &lt; y &gt; en el nombre (CP-011 d)</span></li>
<li><b>Descripción</b>, en este orden: Caso y paso · Pasos para reproducir (numerados) · Resultado esperado (el de la guía) · Resultado obtenido · Datos usados · Ambiente: <i>Demo pública OrangeHRM 5.9, Chrome, Windows 11</i> · Capturas.</li>
<li><b>Prioridad</b> y <b>Severidad</b> (al final del formulario) según la tabla de "Si algo falla": S1→Highest, S2→High, S3→Medium, S4→Low.</li>
<li><b>Actividades vinculadas:</b> elegir <b>está relacionado con</b> y escribir la historia (G4QA-6…).</li>
<li><b>Adjunto:</b> arrastrar la captura del fallo. <b>Sprint:</b> Sprint 1.</li>
<li>Pulsar <b>Crear</b>. Queda en estado <b>Nuevo</b> (no lo cambies). Poner la clave nueva en el Excel (BUG ASOCIADO) y mandársela a Santiago.</li>
</ol>
<div class="caja ojo">Antes de crear, revisar que no exista ya (G4QA-22 y G4QA-23 ya están). Si es el mismo, solo comentar en ese defecto.</div>
<div class="caja"><b>Si no puedes entrar a Jira:</b> no te detengas. Registra todo en el Excel, pon <span class="mono">PENDIENTE JIRA</span> en BUG ASOCIADO y mándale a Santiago por chat las capturas de los fallos ese mismo día. Él lo registra a su nombre con la nota <i>"ejecutado por Ignacio/Andrés el &lt;fecha&gt;, registrado por Santiago"</i> y te pasa la clave.</div>
</div>
<div style="flex:0.75">
<img src="%s" style="width:100%%;height:62mm;object-fit:contain;border:1px solid #c9d1de;border-radius:3px;margin-top:2mm"><div class="pie">Historia G4QA-6: abajo "Añadir un comentario…" y los defectos vinculados</div>
<img src="%s" style="width:100%%;height:62mm;object-fit:contain;border:1px solid #c9d1de;border-radius:3px;margin-top:2mm"><div class="pie">+ Crear, expandido, tipo Error: Resumen, Descripción, Prioridad…</div>
<img src="%s" style="width:100%%;height:62mm;object-fit:contain;border:1px solid #c9d1de;border-radius:3px;margin-top:2mm"><div class="pie">Más abajo: Actividades vinculadas, Adjunto, Entorno y Severidad</div>
</div></div>
</div>
''' % (img(J + 'j2c.jpg'), img(J + 'j4c.jpg'), img(J + 'j5c.jpg'))
doc = '<!doctype html><html lang="es"><head><meta charset="utf-8"><style>%s</style></head><body>%s</body></html>' % (CSS, body)
pdf(doc, os.path.join(SALIDA, 'Guia_Jira_G4QA.pdf'))
print('ok')
