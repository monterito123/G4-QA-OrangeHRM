import copy, json, os, sys, shutil, html
sys.path.insert(0, os.path.dirname(__file__))
import catalogo as K
import openpyxl
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import PatternFill

SALIDA = '/mnt/user-data/outputs/06_PRUEBAS_REALES/kit_ejecucion'
PLANTILLA = '/mnt/user-data/uploads/Calidad de Software/01_ORIGINALES/0. Templates (Examen I y II)/3-Registro de casos de prueba.xlsx'
os.makedirs(SALIDA, exist_ok=True)

FECHAS = {  # fecha planificada por caso (reparto de los días del Anexo B)
    1: {cp: '09/11/2026' for cp in K.ORDEN[1]},
    2: {**{cp: '09/11/2026' for cp in ['CP-001', 'CP-002', 'CP-003', 'CP-010', 'CP-011', 'CP-012', 'CP-013']},
        **{cp: '10/11/2026' for cp in ['CP-005', 'CP-006', 'CP-007', 'CP-004', 'CP-008', 'CP-009']},
        **{cp: '11/11/2026' for cp in ['CP-015', 'CP-016', 'CP-017', 'CP-018', 'CP-014']}},
    3: {**{cp: '11/11/2026' for cp in ['CP-021', 'CP-022', 'CP-019', 'CP-020', 'CP-023']},
        **{cp: '12/11/2026' for cp in ['CP-024', 'CP-025', 'CP-026', 'CP-027']}},
}


def hus(c):
    return ', '.join('%s (%s)' % (K.HU[r][1], K.HU[r][0]) for r in c['rf'])


# ---------------------------------------------------------------- Excel
def excel(ciclos, archivo):
    wb = openpyxl.load_workbook(PLANTILLA)
    base = wb['TEST CASE 001']
    verde = PatternFill(start_color='FF92D050', end_color='FF92D050', fill_type='solid')
    rojo = PatternFill(start_color='FFFF7171', end_color='FFFF7171', fill_type='solid')
    amarillo = PatternFill(start_color='FFFFE699', end_color='FFFFE699', fill_type='solid')
    for ciclo in ciclos:
        quien = K.CICLO[ciclo]['quien']
        for cp in K.ORDEN[ciclo]:
            c = K.POR_ID[cp]
            ws = wb.copy_worksheet(base)
            ws.title = 'C%d %s' % (ciclo, cp)
            ws.column_dimensions['I'].width = 30
            ws.column_dimensions['G'].width = 14
            ws.column_dimensions['H'].width = 22
            ws['D5'] = c['titulo']
            ws['E5'] = K.PRIORIDAD[c['prio']]
            ws['F5'] = cp
            ws['G5'] = 'C%d-%s' % (ciclo, cp)
            ws['H5'] = FECHAS[ciclo][cp]
            ws['F7'] = 'Andrés Rojas e Ignacio Jiménez (Plan EX01)'
            ws['G7'] = quien
            ws['H7'] = None
            ws['D10'] = '%s Verifica %s. Técnica: %s.' % (c['descripcion'], hus(c), c['tecnica'])
            ws['F10'] = c['dependencias']
            ws['G10'] = 'Demo pública OrangeHRM 5.9, Chrome. %s Datos: %s' % (c['prerrequisitos'], c['datos'])
            ws['H10'] = 'PENDING '
            for col in 'DFGH':
                ws[col + '10'].alignment = copy.copy(ws['D10'].alignment).__class__(wrap_text=True, vertical='top')
            ws.row_dimensions[10].height = 120
            # Columna extra para el nombre de la captura
            ws['I12'] = 'CAPTURA (NOMBRE DEL ARCHIVO)'
            ws['I12']._style = copy.copy(ws['H12']._style)
            for i, (paso, esperado, cap) in enumerate(c['pasos']):
                r = 13 + i
                ws['C%d' % r] = i + 1
                ws['D%d' % r] = paso
                ws['E%d' % r] = esperado
                ws['F%d' % r] = None
                ws['G%d' % r] = 'PENDING '
                ws['H%d' % r] = None
                ws['I%d' % r] = K.nombre_captura(ciclo, cp, cap) if cap else '—'
                ws['I%d' % r]._style = copy.copy(ws['H%d' % r]._style)
                ws['G%d' % r]._style = copy.copy(ws['G13']._style)
                largo = max(len(paso) / 48, len(esperado) / 22, 1)
                ws.row_dimensions[r].height = min(15 * (int(largo) + 1), 120)
            if c.get('defecto_conocido'):
                r = 13 + len(c['pasos']) + 1
                ws['D%d' % r] = 'Defecto conocido: ' + c['defecto_conocido']
            dv = DataValidation(type='list', formula1="STATUS!$A$2:$A$4", allow_blank=True)
            ws.add_data_validation(dv)
            dv.add('G13:G20')
            dv.add('H10')
            dvp = DataValidation(type='list', formula1="'CLAVE DE PRIORIDAD'!$A$2:$A$4", allow_blank=True)
            ws.add_data_validation(dvp)
            dvp.add('E5')
            for rango, celda in (('G13:G20', 'G13'), ('H10', 'H10')):
                ws.conditional_formatting.add(rango, FormulaRule(formula=['NOT(ISERROR(SEARCH("PASS",%s)))' % celda], fill=verde))
                ws.conditional_formatting.add(rango, FormulaRule(formula=['NOT(ISERROR(SEARCH("FAIL",%s)))' % celda], fill=rojo))
                ws.conditional_formatting.add(rango, FormulaRule(formula=['NOT(ISERROR(SEARCH("PENDING",%s)))' % celda], fill=amarillo))
    del wb['TEST CASE 001']
    del wb['TEST CASE 002']
    # Las hojas de claves van al final
    for nombre in ['CLAVE DE PRIORIDAD', 'STATUS']:
        hoja = wb[nombre]
        wb.move_sheet(hoja, offset=len(wb.sheetnames))
    wb.active = 0
    wb.save(archivo)


# ---------------------------------------------------------------- PDF (HTML)
CSS = '''
@page { size: Letter; margin: 13mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 9.6pt; color: #1b2433; line-height: 1.36; margin: 0; }
.pag { page-break-after: always; }
.pag:last-child { page-break-after: auto; }
h1 { font-size: 18pt; margin: 0 0 2mm; color: #0b1220; }
h2 { font-size: 12.5pt; margin: 4mm 0 1.5mm; color: #0b1220; border-bottom: 1.5px solid #2bd4e6; padding-bottom: 1mm; }
h3 { font-size: 10.5pt; margin: 3mm 0 1mm; }
.sub { color: #5a6780; margin-bottom: 3mm; }
.cab { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #0b1220; padding-bottom: 1.5mm; margin-bottom: 2.5mm; }
.cab .id { font-size: 20pt; font-weight: bold; }
.cab .t { font-size: 13pt; font-weight: bold; flex: 1; margin-left: 4mm; }
.chips span { display: inline-block; border: 1px solid #9aa6bb; border-radius: 10px; padding: 0.3mm 2.5mm; margin-right: 1.5mm; font-size: 8.5pt; }
.chips .p1 { border-color: #d64545; color: #b02a2a; } .chips .p2 { border-color: #c78a00; color: #8a5f00; } .chips .p3 { border-color: #2f7d5b; color: #2f7d5b; }
.caja { border: 1px solid #c9d1de; border-radius: 4px; padding: 2mm 3mm; margin: 2mm 0; }
.datos { background: #fff8e1; border-color: #f5b841; }
.datos b { color: #8a5f00; }
.ojo { background: #ffecec; border-color: #ff5c6c; }
.ok { background: #eafaf2; border-color: #3ddc97; }
table { border-collapse: collapse; width: 100%; margin: 1.5mm 0; }
th { background: #0b1220; color: #fff; text-align: left; padding: 1.4mm 2mm; font-size: 8.8pt; }
td { border: 1px solid #c9d1de; padding: 1.4mm 2mm; vertical-align: top; }
td.n { width: 6mm; text-align: center; font-weight: bold; }
td.cap { width: 34mm; font-family: "DejaVu Sans Mono", monospace; font-size: 8pt; }
td.cap.no { color: #9aa6bb; font-family: inherit; }
code, .mono { font-family: "DejaVu Sans Mono", monospace; font-size: 8.6pt; background: #eef1f6; padding: 0 1mm; border-radius: 2px; }
ul, ol { margin: 1mm 0 1mm 5mm; padding: 0; } li { margin: 0.6mm 0; }
.denso { font-size: 8.5pt; } .denso h2 { margin: 2.5mm 0 1mm; font-size: 11pt; } .denso td, .denso th { padding: 1mm 1.6mm; } .denso h1 { font-size: 16pt; }
.pie { color: #5a6780; font-size: 8pt; margin-top: 2mm; }
.dos { display: flex; gap: 4mm; } .dos > div { flex: 1; }
img.cap { width: 100%; border: 1px solid #c9d1de; border-radius: 3px; }
'''


def e(t):
    return html.escape(t)


def marcar(t):
    # Resalta los datos de la hoja ([D1], [CLAVE ESS]...)
    import re
    t = e(t)
    return re.sub(r'\[([A-ZÁÉÍÓÚ0-9 ]+)\]', r'<b style="color:#8a5f00">[\1]</b>', t)


def pagina_caso(ciclo, cp):
    c = K.POR_ID[cp]
    filas = ''
    for i, (paso, esperado, cap) in enumerate(c['pasos']):
        if cap:
            celda = '<td class="cap">%s<br><span style="font-family:DejaVu Sans;color:#5a6780">%s</span></td>' % (K.nombre_captura(ciclo, cp, cap), e(c['capturas'][cap]))
        else:
            celda = '<td class="cap no">sin captura</td>'
        filas += '<tr><td class="n">%d</td><td>%s</td><td>%s</td>%s</tr>' % (i + 1, marcar(paso), marcar(esperado), celda)
    extra = ''
    if c.get('defecto_conocido'):
        extra += '<div class="caja ojo"><b>Defecto conocido.</b> %s</div>' % e(c['defecto_conocido'])
    if c.get('nota'):
        extra += '<div class="caja ojo"><b>Ojo.</b> %s</div>' % e(c['nota'])
    hu_txt = ', '.join('%s → %s' % (K.HU[r][1], K.HU[r][0]) for r in c['rf'])
    jira = K.HU[c['rf'][0]][0]
    return '''
<div class="pag">
  <div class="cab"><div class="id">%s</div><div class="t">%s</div><div class="chips"><span class="%s">%s</span><span>Ciclo %d</span></div></div>
  <div class="sub">%s · Verifica %s · Técnica: %s · Fecha planificada: <b>%s</b></div>
  <div class="caja"><b>Antes de empezar:</b> %s</div>
  <div class="caja datos"><b>Datos que vas a usar:</b> %s</div>
  <table><tr><th>#</th><th>Qué hacer</th><th>Qué debe pasar</th><th>Captura (Win+Shift+S)</th></tr>%s</table>
  <div class="caja"><b>Resultado esperado del Plan:</b> %s</div>
  %s
  <div class="caja ok"><b>Al terminar este caso:</b> (1) Excel, hoja <span class="mono">C%d %s</span>: llenar RESULTADOS ACTUALES, PASS/FAIL de cada paso, FECHA DE EJECUCIÓN y ESTADO DEL CASO. (2) Jira, en <b>%s</b>: comentario <span class="mono">Ciclo %d · %s · PASS (o FAIL) · fecha · tu nombre · capturas C%d_%s_…</span>. (3) Si falló: ver la página "Si algo falla". Sin acceso a Jira: ver "Si no puedes entrar a Jira" (última página).</div>
  <div class="pie">Guía de ejecución · Grupo 4 · BISI07 Calidad del Software · pasos tomados del Plan de pruebas del EX01 (sección 3)</div>
</div>''' % (cp, e(c['titulo']), c['prio'].lower(), K.PRIORIDAD[c['prio']], ciclo, e(c['descripcion']), hu_txt, e(c['tecnica']),
             FECHAS[ciclo][cp], marcar(c['prerrequisitos']), marcar(c['datos']), filas, e(c['esperado']), extra,
             ciclo, cp, jira, ciclo, cp, ciclo, cp)


def portada(ciclos, quien, carpeta):
    nombres = ' y '.join(K.CICLO[c]['nombre'] for c in ciclos)
    fechas = '; '.join('%s: %s' % (K.CICLO[c]['nombre'].split(' · ')[0], K.CICLO[c]['fecha']) for c in ciclos)
    total = sum(len(K.ORDEN[c]) for c in ciclos)
    agenda = ''
    for c in ciclos:
        por_dia = {}
        for cp in K.ORDEN[c]:
            por_dia.setdefault(FECHAS[c][cp], []).append(cp)
        for dia, cps in por_dia.items():
            agenda += '<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % (dia, K.CICLO[c]['nombre'], ', '.join(cps))
    return '''
<div class="pag denso">
  <h1>Kit de ejecución · %s</h1>
  <div class="sub">%s · %d casos · Plan de pruebas del EX01 (Grupo 4) · %s</div>
  <h2>Qué haces tú y qué hace Santiago</h2>
  <div class="dos"><div class="caja ok"><b>Tú (lo único):</b><ol><li>Ejecutar tus casos en el orden de la tabla, siguiendo cada página tal cual.</li><li>Tomar las capturas con el nombre exacto que dice cada paso.</li><li>Llenar en el Excel el resultado obtenido, la fecha, el estado y el nombre de la captura.</li><li>Comentar el resultado en Jira y, si hay un defecto, registrarlo (ver la guía de Jira).</li><li>Mandarle a Santiago la carpeta y el Excel (página final).</li></ol></div>
  <div class="caja"><b>Santiago (ya lo hizo o lo hace él):</b><ul><li>Prepara los datos en la demo la mañana de cada día y te manda la <b>hoja de datos</b>.</li><li>Te deja el Excel prellenado con pasos, datos y resultados esperados.</li><li>Revisa lo que le mandes, lo ordena en evidencias y actualiza las métricas.</li><li>Decide cuando hay duda si algo es defecto o problema de la demo.</li></ul></div></div>
  <h2>Agenda</h2>
  <table><tr><th>Día</th><th>Ciclo</th><th>Casos, en este orden</th></tr>%s</table>
  <div class="caja"><b>Criterio de salida:</b> %s No hace falta terminar todo en un día, pero sí respetar el orden: unos casos crean los datos de otros.</div>
  <h2>Preparación (una sola vez, 5 minutos)</h2>
  <ol>
    <li>En el Escritorio, crear la carpeta <span class="mono">%s</span>. Ahí van todas las capturas y el Excel.</li>
    <li>Guardar ahí el Excel que te mandó Santiago y abrirlo.</li>
    <li>Abrir <b>Google Chrome</b> (normal, no incógnito) en <span class="mono">https://opensource-demo.orangehrmlive.com</span>. Ventana maximizada.</li>
    <li>Tener a mano la <b>hoja de datos del día</b> (la manda Santiago cada mañana). Todo lo que en esta guía aparece así: <b style="color:#8a5f00">[D1]</b>, sale de esa hoja.</li>
  </ol>
  <h2>Cómo tomar cada captura</h2>
  <ol>
    <li>Cuando el paso lo pide, pulsar <b>Win + Shift + S</b> y elegir <b>Ventana</b> (o arrastrar sobre toda la ventana de Chrome). Que se vea la barra de direcciones.</li>
    <li>Hacer clic en la notificación que sale abajo a la derecha. Se abre la Herramienta Recortes.</li>
    <li>Pulsar <b>Ctrl + S</b>, entrar a la carpeta del paso anterior y escribir el nombre exacto, por ejemplo <span class="mono">%s</span> (Windows agrega el .png).</li>
    <li>Si te equivocas de nombre, renómbrala en la carpeta. No importa el orden en que las tomes, sí el nombre.</li>
  </ol>
  <div class="caja ojo"><b>Nunca</b> captures ni escribas contraseñas reales tuyas. Las únicas claves de esta guía son las de prueba de la demo.</div>
</div>''' % (quien, nombres, total, fechas, agenda, ' '.join(K.CICLO[c]['criterio'] for c in ciclos), carpeta, K.nombre_captura(ciclos[-1], K.ORDEN[ciclos[-1]][1], 1).replace('.png',''))


def pagina_fallos(ciclos):
    recrear = ''
    if 2 in ciclos:
        extra_recrear = '<li>Si vas por los casos de Leave: Leave > Entitlements > Add: G4-Ana, <b style="color:#8a5f00">[TIPO DE LICENCIA]</b>, 5 días. Si el tipo no existe: Leave > Configure > Leave Types > Add <b>G4-Vacaciones</b>.</li>'
    else:
        extra_recrear = '<li>El proyecto de Time, el evento de Claim, el puesto de G4-Ana y G4-Luis no los recrees tú: pídele a Santiago que corra otra vez el script del ciclo 3 (tarda 2 minutos) y sigue con otro caso mientras tanto.</li>'
    if 2 in ciclos or 3 in ciclos:
        recrear = '''
  <h2>Si la demo borró los datos</h2>
  <div class="caja">Síntomas: <b>G4-Ana</b> no aparece en PIM, <b>g4.ess01</b> da "Invalid credentials" o desapareció algo que creaste antes. La demo se reinicia sola.
  <ol><li>Avísale a Santiago por chat ("se reinició la demo") y anota en el Excel la hora.</li>
  <li>Si no contesta en 10 minutos, recréalo tú como Admin:
    <ul><li>PIM > Add Employee: First Name <b>G4-Ana</b>, Last Name <b>Prueba</b> > Save.</li>
    <li>Admin > Users > Add: ESS, G4-Ana, Enabled, usuario <b>g4.ess01</b>, clave <b style="color:#8a5f00">[CLAVE ESS]</b> > Save.</li>
    %s</ul></li>
  <li>Repite el caso que estabas haciendo desde el paso 1. Lo de antes del reinicio se queda como está (no hay que repetirlo).</li></ol></div>''' % extra_recrear
    conocidos = '<li><b>G4QA-23</b> · CP-011 (d): la demo guarda un nombre con &lt; y &gt;. Si te pasa, marca FAIL, pon G4QA-23 en BUG ASOCIADO y comenta en G4QA-23 "Reproducido en el ciclo 2 manual (fecha)". No crees otro.</li>' if 2 in ciclos else ''
    return '''
<div class="pag denso">
  <h1>Si algo falla</h1>
  <div class="sub">Primero hay que saber si es un defecto de OrangeHRM o un problema de la demo.</div>
  <table><tr><th style="width:33%%">Lo que ves</th><th style="width:30%%">Qué es</th><th>Qué haces</th></tr>
  <tr><td>La página no carga, sale "Internal Server Error", tarda muchísimo o se cae a mitad</td><td>Problema de la demo (es pública y la usa mucha gente)</td><td>Esperar 5 minutos, recargar (F5) y repetir el caso. En el Excel no marques nada todavía. Si sigue así 30 minutos, avísale a Santiago.</td></tr>
  <tr><td>Admin / admin123 no entra</td><td>Alguien le cambió la clave a la demo</td><td>Avísale a Santiago y espera a que se reinicie (suele ser menos de una hora).</td></tr>
  <tr><td>Desapareció un dato G4- que ya estaba</td><td>La demo se reinició</td><td>Ver "Si la demo borró los datos" abajo.</td></tr>
  <tr><td>El sistema hace algo distinto a "Qué debe pasar", y al repetirlo con los datos bien pasa lo mismo</td><td><b>Defecto</b></td><td>Paso FAIL en el Excel con lo que viste. Captura del fallo. Registrar el defecto en Jira (guía de Jira) y poner su clave (G4QA-…) en BUG ASOCIADO. Seguir con los demás pasos si se puede.</td></tr>
  <tr><td>No estás seguro de si está mal</td><td>Duda</td><td>Marca FAIL provisional, toma la captura y mándale a Santiago la captura con una línea de qué esperabas y qué salió. Él decide si se registra. No crees el defecto todavía.</td></tr>
  </table>
  <h2>Defectos que ya conocemos (no se vuelven a registrar)</h2>
  <ul>%s<li><b>G4QA-22</b> · rendimiento del login con 50 usuarios (solo prueba de carga, no te va a salir en manual).</li></ul>
  <h2>Severidad y prioridad (según la Estrategia del EX01)</h2>
  <table><tr><th>Severidad (campo Severidad)</th><th>Cuándo</th><th>Prioridad en Jira</th></tr>
  <tr><td>S1 Fallo/Legal</td><td>No se puede usar una función crítica (login, datos de otros visibles, se pierde información)</td><td>Highest</td></tr>
  <tr><td>S2 Mayor</td><td>Una función importante falla y no hay forma razonable de hacerlo de otra manera</td><td>High</td></tr>
  <tr><td>S3 Menor</td><td>Falla, pero hay una forma de seguir o el efecto es limitado</td><td>Medium</td></tr>
  <tr><td>S4 Incidental</td><td>Detalle: texto, mensaje, aspecto, validación menor</td><td>Low</td></tr></table>
  %s
</div>''' % (conocidos, recrear)


def pagina_entrega(ciclos, carpeta):
    caps = []
    for c in ciclos:
        for cp in K.ORDEN[c]:
            caps += [K.nombre_captura(c, cp, n) for n in sorted(K.POR_ID[cp]['capturas'])]
    return '''
<div class="pag">
  <h1>Al terminar: entrega a Santiago</h1>
  <ol>
    <li>Revisar que en la carpeta <span class="mono">%s</span> estén las <b>%d capturas</b> de la lista de abajo (las que falten por un caso bloqueado, avísalo).</li>
    <li>Guardar el Excel (Ctrl + S) dentro de la misma carpeta.</li>
    <li>Clic derecho en la carpeta > <b>Comprimir en archivo ZIP</b>.</li>
    <li>Mandarle el ZIP a Santiago por chat <b>como archivo/documento</b> (en WhatsApp: clip > Documento). Nunca como foto: las fotos se comprimen y pierden calidad.</li>
    <li>Escribirle una línea: cuántos pasaron, cuántos fallaron y las claves de los defectos que registraste.</li>
  </ol>
  <h2>Si no puedes entrar a Jira</h2>
  <div class="caja ojo">Si el día de tu ciclo Jira no te deja entrar (no te llegó la invitación, te pide un acceso que no tienes, etc.), <b>no te detengas</b>:
  <ol><li>Sigue ejecutando y registra todo en el Excel como siempre (resultado, PASS/FAIL, fecha, estado, captura).</li>
  <li>Si un caso falla, en BUG ASOCIADO escribe <span class="mono">PENDIENTE JIRA</span> y en RESULTADOS ACTUALES describe el fallo con detalle (qué hiciste, qué esperabas, qué salió).</li>
  <li>Mándale a Santiago por chat, ese mismo día, las capturas de los fallos y una línea por cada uno.</li>
  <li>Santiago registra en Jira los resultados y los defectos a su nombre, con la nota <i>"ejecutado por %s el &lt;fecha&gt;, registrado por Santiago"</i>, y te devuelve la clave (G4QA-…) para que la pongas en el Excel.</li></ol></div>
  <h2>Lista de capturas esperadas</h2>
  <div style="column-count:3; font-family:DejaVu Sans Mono; font-size:8pt;">%s</div>
</div>''' % (carpeta, len(caps), K.CICLO[ciclos[0]]['corto'], '<br>'.join('☐ ' + x for x in caps))


def pdf(html_txt, destino):
    from playwright.sync_api import sync_playwright
    tmp = destino.replace('.pdf', '.html')
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(html_txt)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto('file://' + tmp)
        pg.pdf(path=destino, format='Letter', print_background=True, margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
        b.close()
    os.remove(tmp)


def kit(ciclos, quien, archivo_pdf, archivo_xlsx, carpeta):
    cuerpo = portada(ciclos, quien, carpeta) + pagina_fallos(ciclos)
    for c in ciclos:
        for cp in K.ORDEN[c]:
            cuerpo += pagina_caso(c, cp)
    cuerpo += pagina_entrega(ciclos, carpeta)
    doc = '<!doctype html><html lang="es"><head><meta charset="utf-8"><style>%s</style></head><body>%s</body></html>' % (CSS, cuerpo)
    pdf(doc, os.path.join(SALIDA, archivo_pdf))
    excel(ciclos, os.path.join(SALIDA, archivo_xlsx))


if __name__ == '__main__':
    kit([1, 2], 'Ignacio Jiménez Sánchez', 'Kit_Ciclos1y2_Ignacio.pdf', 'Registro_casos_Ciclos1y2_Ignacio.xlsx', 'G4_Ciclos1y2_Ignacio')
    kit([3], 'Andrés Rojas Oviedo', 'Kit_Ciclo3_Andres.pdf', 'Registro_casos_Ciclo3_Andres.xlsx', 'G4_Ciclo3_Andres')
    # Catálogo de capturas esperadas, para revisar_evidencias.ps1
    esperado = {}
    for c in (1, 2, 3):
        for cp in K.ORDEN[c]:
            for n, que in sorted(K.POR_ID[cp]['capturas'].items()):
                esperado[K.nombre_captura(c, cp, n).replace('.png', '')] = {'ciclo': c, 'caso': cp, 'que': que}
    with open(os.path.join(SALIDA, 'capturas_esperadas.json'), 'w', encoding='utf-8') as f:
        json.dump(esperado, f, ensure_ascii=False, indent=1)
    print('ok', len(esperado))
