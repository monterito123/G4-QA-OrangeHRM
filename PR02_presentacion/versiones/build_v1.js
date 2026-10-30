const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const fa = require('react-icons/fa6');
const { applyTheme } = require('/root/.claude/skills/synced/ada401aa-e849-4e8b-80b5-b1ab04f02c27_931ad66f-e172-4d76-85f4-9a74544a9f25/pptx/scripts/apply_theme.js');

const IMG = path.join(__dirname, 'img');
const im = (f) => path.join(IMG, f);
const has = (f) => fs.existsSync(im(f));

// Paleta del EX01 del Grupo 4
const H = {
  bg: '0B1220', card: '152038', card2: '26344F', text: 'E8EEF7', muted: '8C9BB5',
  cyan: '2BD4E6', amber: 'F5B841', green: '3DDC97', red: 'FF5C6C', blue: '6C8CFF'
};
const THEME = {
  name: 'Grupo 4 QA', headFontFace: 'Bahnschrift', bodyFontFace: 'Bahnschrift',
  colors: { dk1: H.bg, lt1: H.text, dk2: H.card, lt2: H.muted, accent1: H.cyan, accent2: H.amber, accent3: H.green, accent4: H.red, accent5: H.blue, accent6: H.card2, hlink: H.cyan, folHlink: H.blue }
};
const PERSONA = {
  Santiago: { color: H.cyan, nombre: 'Santiago' },
  Andres: { color: H.amber, nombre: 'Andrés' },
  Ignacio: { color: H.green, nombre: 'Ignacio' }
};

async function icono(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: '#' + color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return 'image/png;base64,' + buf.toString('base64');
}

function imgSize(f) {
  const buf = fs.readFileSync(im(f));
  if (f.endsWith('.png')) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  // JPEG: buscar SOF
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xC0 && m <= 0xC3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { w: 16, h: 9 };
}

// Imagen dentro de una caja, sin deformar, centrada
function imgFit(slide, f, x, y, w, h, opts = {}) {
  const s = imgSize(f);
  const r = Math.min(w / s.w, h / s.h);
  const iw = s.w * r, ih = s.h * r;
  const ix = x + (w - iw) / 2, iy = opts.top ? y : y + (h - ih) / 2;
  slide.addImage({ path: im(f), x: ix, y: iy, w: iw, h: ih, rounding: false, altText: opts.alt || f, objectName: opts.name || f });
  return { x: ix, y: iy, w: iw, h: ih };
}

// Marco de captura: tarjeta oscura con la imagen y un pie corto
function captura(slide, f, x, y, w, h, pie, opts = {}) {
  slide.addShape('roundRect', { x, y, w, h, fill: { color: H.card }, line: { color: H.card2, width: 0.75 }, rectRadius: 0.12, objectName: 'marco ' + f });
  const pad = 0.12;
  const pieH = pie ? 0.34 : 0;
  const r = imgFit(slide, f, x + pad, y + pad, w - 2 * pad, h - 2 * pad - pieH, opts);
  if (pie) {
    slide.addText(pie, { x: x + pad, y: y + h - pieH - 0.06, w: w - 2 * pad, h: pieH, fontSize: 11, color: H.muted, margin: 0, isTextBox: true, valign: 'middle', objectName: 'pie ' + f });
  }
  return r;
}

function titulo(slide, t) {
  slide.addText(t, { x: 0.6, y: 0.38, w: 12.1, h: 0.7, fontSize: 30, bold: true, color: H.text, margin: 0, isTextBox: true, valign: 'middle', objectName: 'titulo' });
}

function pieDiapo(slide, persona, n) {
  const p = PERSONA[persona];
  slide.addShape('roundRect', { x: 0.6, y: 6.93, w: 1.35, h: 0.32, fill: { color: H.card }, line: { color: p.color, width: 1 }, rectRadius: 0.16, objectName: 'expositor' });
  slide.addText(p.nombre, { x: 0.6, y: 6.93, w: 1.35, h: 0.32, fontSize: 11, color: p.color, bold: true, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'expositor texto' });
  slide.addText(String(n), { x: 12.2, y: 6.93, w: 0.55, h: 0.32, fontSize: 11, color: H.muted, align: 'right', valign: 'middle', margin: 0, isTextBox: true, objectName: 'numero' });
}

function tarjeta(slide, x, y, w, h, name) {
  slide.addShape('roundRect', { x, y, w, h, fill: { color: H.card }, line: { color: H.card2, width: 0.75 }, rectRadius: 0.12, objectName: name || 'tarjeta' });
}

function badge(slide, n, x, y, color, d = 0.42) {
  slide.addShape('ellipse', { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 }, objectName: 'numero ' + n });
  slide.addText(String(n), { x, y, w: d, h: d, fontSize: 14, bold: true, color: H.bg, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'numero texto ' + n });
}

function stat(slide, x, y, w, h, valor, etiqueta, color, tam = 34) {
  tarjeta(slide, x, y, w, h, 'dato ' + etiqueta);
  slide.addText(valor, { x: x + 0.25, y: y + 0.18, w: w - 0.5, h: h * 0.5, fontSize: tam, bold: true, color, margin: 0, isTextBox: true, valign: 'middle', objectName: 'valor ' + etiqueta });
  slide.addText(etiqueta, { x: x + 0.25, y: y + 0.2 + h * 0.5, w: w - 0.5, h: h * 0.42 - 0.2, fontSize: 13, color: H.muted, margin: 0, isTextBox: true, valign: 'top', objectName: 'etiqueta ' + etiqueta });
}

async function main() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = 'PR02 JMeter y BlazeMeter - Grupo 4';
  pres.author = 'Grupo 4: Santiago Montero, Andrés Rojas, Ignacio Jiménez';
  pres.subject = 'BISI07 Calidad del Software - Universidad Latina de Costa Rica';
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };

  pres.defineSlideMaster({ title: 'G4 oscuro', background: { color: H.bg }, objects: [] });

  const I = {
    chart: await icono(fa.FaChartLine, H.cyan), shield: await icono(fa.FaShieldHalved, H.green), rec: await icono(fa.FaCircleDot, H.red),
    code: await icono(fa.FaCode, H.cyan), key: await icono(fa.FaKey, H.amber), users: await icono(fa.FaUsers, H.cyan),
    flask: await icono(fa.FaFlask, H.green), bug: await icono(fa.FaBug, H.red), laptop: await icono(fa.FaLaptop, H.amber),
    play: await icono(fa.FaPlay, H.green), book: await icono(fa.FaBookOpen, H.blue), server: await icono(fa.FaServer, H.cyan),
    globe: await icono(fa.FaGlobe, H.red), docker: await icono(fa.FaDocker, H.cyan), ban: await icono(fa.FaBan, H.red),
    check: await icono(fa.FaCircleCheck, H.green), xmark: await icono(fa.FaCircleXmark, H.red), cookie: await icono(fa.FaCookieBite, H.amber),
    clock: await icono(fa.FaClock, H.amber), list: await icono(fa.FaListCheck, H.green), filter: await icono(fa.FaFilter, H.blue),
    layer: await icono(fa.FaLayerGroup, H.cyan), gauge: await icono(fa.FaGaugeHigh, H.amber), lightbulb: await icono(fa.FaLightbulb, H.amber),
    arrow: await icono(fa.FaArrowRight, H.muted), magnify: await icono(fa.FaMagnifyingGlassChart, H.cyan), file: await icono(fa.FaFileCode, H.amber),
    chrome: await icono(fa.FaChrome, H.amber), eye: await icono(fa.FaEye, H.cyan), report: await icono(fa.FaFileLines, H.blue),
    stopwatch: await icono(fa.FaStopwatch, H.red), handshake: await icono(fa.FaScaleBalanced, H.green), mountain: await icono(fa.FaMountain, H.blue)
  };

  const notas = {};
  let n = 0;
  const nueva = (seccion) => { n++; return pres.addSlide({ masterName: 'G4 oscuro', sectionTitle: seccion }); };

  // ---------- 1. Portada ----------
  pres.addSection({ title: 'Inicio' });
  let s = nueva('Inicio');
  s.addText('JMeter & BlazeMeter', { x: 0.6, y: 1.25, w: 6.6, h: 0.9, fontSize: 40, bold: true, color: H.text, margin: 0, isTextBox: true, objectName: 'titulo' });
  s.addText('Prueba de carga real sobre OrangeHRM 5.9', { x: 0.6, y: 2.15, w: 6.6, h: 0.5, fontSize: 18, italic: true, color: H.cyan, margin: 0, isTextBox: true, objectName: 'subtitulo' });
  s.addText([
    { text: 'PR02 · BISI07 – Calidad del Software', options: { breakLine: true } },
    { text: 'Universidad Latina de Costa Rica', options: { breakLine: true } },
    { text: 'Lic. Hersann Fonseca Quirós', options: { breakLine: true } },
    { text: '4 de noviembre de 2026', options: { color: H.amber } }
  ], { x: 0.6, y: 3.0, w: 6.4, h: 1.4, fontSize: 14, color: H.text, margin: 0, isTextBox: true, paraSpaceAfter: 4, objectName: 'datos del curso' });
  s.addText('Grupo 4', { x: 0.6, y: 4.95, w: 3, h: 0.35, fontSize: 14, bold: true, color: H.muted, margin: 0, isTextBox: true, objectName: 'grupo' });
  s.addText([
    { text: 'Santiago Montero Sancho', options: { color: H.cyan } }, { text: '     ' },
    { text: 'Andrés Rojas Oviedo', options: { color: H.amber } }, { text: '     ' },
    { text: 'Ignacio Jiménez Sánchez', options: { color: H.green } }
  ], { x: 0.6, y: 5.3, w: 7.2, h: 0.4, fontSize: 13, margin: 0, isTextBox: true, objectName: 'integrantes' });
  captura(s, '09_grafico_usuarios_activos_vs_tiempo_login.png', 7.55, 1.25, 5.2, 3.15, null, { alt: 'Gráfico de la corrida 2: usuarios activos contra tiempo del login' });
  stat(s, 7.55, 4.6, 2.5, 1.2, '50', 'usuarios simultáneos', H.cyan, 32);
  stat(s, 10.25, 4.6, 2.5, 1.2, '10 500', 'peticiones medidas', H.amber, 32);
  pieDiapo(s, 'Santiago', n);
  notas[n] = `SANTIAGO (30 s)
Buenas tardes. Somos el Grupo 4: Andrés, Ignacio y yo. Hoy les contamos cómo hicimos una prueba de carga de verdad con JMeter y BlazeMeter sobre OrangeHRM 5.9, el mismo sistema que usamos en el Examen I.
El gráfico de la derecha es real: es nuestra corrida con 50 usuarios entrando al mismo tiempo. Al final de la presentación lo van a entender completo y vamos a hacer una demo en vivo.`;

  // ---------- 2. Agenda ----------
  s = nueva('Inicio');
  titulo(s, 'Agenda');
  const ag = [
    ['01', 'Conceptos y contexto', 'Tipos de prueba, el sistema y por qué en local', 'Ignacio', H.green, I.mountain],
    ['02', 'Del recorrido al script', 'BlazeMeter, correlación y el plan de JMeter', 'Santiago', H.cyan, I.code],
    ['03', 'Resultados y hallazgo', 'Gráficas, APDEX, veredicto y defecto', 'Andrés', H.amber, I.magnify],
    ['04', 'Demo en vivo', 'JMeter con 1 usuario y el reporte real', 'Santiago', H.cyan, I.play]
  ];
  ag.forEach((a, i) => {
    const x = 0.6 + i * 3.08, y = 1.7, w = 2.88, h = 4.3;
    tarjeta(s, x, y, w, h, 'bloque ' + a[0]);
    s.addText(a[0], { x: x + 0.3, y: y + 0.3, w: 1.2, h: 0.7, fontSize: 34, bold: true, color: a[4], margin: 0, isTextBox: true, objectName: 'num ' + a[0] });
    s.addImage({ data: a[5], x: x + w - 0.85, y: y + 0.4, w: 0.5, h: 0.5, objectName: 'icono ' + a[0] });
    s.addText(a[1], { x: x + 0.3, y: y + 1.35, w: w - 0.6, h: 0.8, fontSize: 19, bold: true, color: H.text, margin: 0, isTextBox: true, valign: 'top', objectName: 'tema ' + a[0] });
    s.addText(a[2], { x: x + 0.3, y: y + 2.2, w: w - 0.6, h: 1.1, fontSize: 14, color: H.muted, margin: 0, isTextBox: true, valign: 'top', objectName: 'detalle ' + a[0] });
    s.addText(a[3], { x: x + 0.3, y: y + h - 0.65, w: w - 0.6, h: 0.35, fontSize: 14, bold: true, color: a[4], margin: 0, isTextBox: true, objectName: 'quien ' + a[0] });
  });
  pieDiapo(s, 'Santiago', n);
  notas[n] = `SANTIAGO (30 s)
La presentación tiene cuatro partes. Ignacio explica qué es una prueba de rendimiento, el sistema y por qué no usamos la demo pública. Yo explico cómo pasamos de una grabación con BlazeMeter a un script de JMeter que funciona. Andrés presenta los resultados, el defecto que encontramos y qué haríamos distinto. Cerramos con una demo en vivo. Le paso a Ignacio.`;

  // ---------- 3. Tipos de prueba ----------
  pres.addSection({ title: 'Conceptos y contexto' });
  s = nueva('Conceptos y contexto');
  titulo(s, '¿Qué es una prueba de rendimiento?');
  const t = Array.from({ length: 13 }, (_, i) => String(i));
  const perfiles = [
    ['Carga', 'Usuarios esperados, de forma realista', [0, 12, 25, 37, 50, 50, 50, 50, 50, 50, 50, 50, 50], H.cyan, true],
    ['Estrés', 'Más allá del límite, hasta que algo falla', [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180], H.red, false],
    ['Picos', 'Una ráfaga de golpe y luego la calma', [10, 10, 10, 10, 120, 120, 10, 10, 10, 10, 10, 10, 10], H.amber, false],
    ['Resistencia', 'Carga normal durante mucho tiempo', [0, 30, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40], H.green, false]
  ];
  perfiles.forEach((p, i) => {
    const x = 0.6 + i * 3.08, y = 1.55, w = 2.88, h = 4.75;
    s.addShape('roundRect', { x, y, w, h, fill: { color: p[4] ? H.card2 : H.card }, line: { color: p[4] ? p[3] : H.card2, width: p[4] ? 1.5 : 0.75 }, rectRadius: 0.12, objectName: 'tipo ' + p[0] });
    s.addText(p[0], { x: x + 0.25, y: y + 0.22, w: w - 0.5, h: 0.5, fontSize: 22, bold: true, color: p[3], margin: 0, isTextBox: true, objectName: 'nombre ' + p[0] });
    s.addChart(pres.charts.LINE, [{ name: 'Usuarios', labels: t, values: p[2] }], {
      x: x + 0.15, y: y + 0.85, w: w - 0.3, h: 2.2, chartColors: [p[3]], lineSize: 3, lineDataSymbol: 'none',
      catAxisHidden: true, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false,
      valAxisMinVal: 0, valAxisMaxVal: 190, plotArea: { fill: { color: p[4] ? H.card2 : H.card } }, objectName: 'perfil ' + p[0]
    });
    s.addText('usuarios ↑   tiempo →', { x: x + 0.25, y: y + 3.05, w: w - 0.5, h: 0.3, fontSize: 10, color: H.muted, margin: 0, isTextBox: true, objectName: 'ejes ' + p[0] });
    s.addText(p[1], { x: x + 0.25, y: y + 3.4, w: w - 0.5, h: 0.75, fontSize: 14, color: H.text, margin: 0, isTextBox: true, valign: 'top', objectName: 'definicion ' + p[0] });
    if (p[4]) s.addText('La nuestra', { x: x + 0.25, y: y + h - 0.5, w: w - 0.5, h: 0.32, fontSize: 13, bold: true, color: p[3], margin: 0, isTextBox: true, objectName: 'la nuestra' });
  });
  s.addText('ISTQB CT-PT (2018), sección 1.2', { x: 6.5, y: 6.93, w: 5.5, h: 0.32, fontSize: 11, color: H.muted, align: 'right', valign: 'middle', margin: 0, isTextBox: true, objectName: 'fuente' });
  pieDiapo(s, 'Ignacio', n);
  notas[n] = `IGNACIO (1 min 15 s)
Una prueba de rendimiento no revisa si el sistema hace lo correcto, sino qué tan rápido y estable responde cuando lo usan muchas personas. El programa de ISTQB de Performance Testing define varios tipos; estos son los cuatro más comunes:
- Carga: se simula la cantidad de usuarios que se espera en la realidad. Es la que hicimos: 50 usuarios.
- Estrés: se sigue subiendo hasta pasar el límite, para ver dónde y cómo se cae.
- Picos: muchos usuarios llegan de golpe y luego se van, como la hora de entrada en una empresa.
- Resistencia: una carga normal durante horas, para encontrar problemas que aparecen con el tiempo, como fugas de memoria.
Cada gráfico es la forma de la carga: usuarios hacia arriba, tiempo hacia la derecha. El nuestro es el primero: sube en 30 segundos y se queda en 50.`;

  // ---------- 4. Contexto ----------
  s = nueva('Conceptos y contexto');
  titulo(s, 'El sistema y el criterio');
  captura(s, '06_login_admin_dashboard_local.jpg', 0.6, 1.45, 7.2, 4.6, 'OrangeHRM 5.9 en nuestra instancia local: Dashboard después del login', { alt: 'Dashboard de OrangeHRM local' });
  stat(s, 8.15, 1.45, 4.6, 1.35, '50 usuarios', 'entrando al mismo tiempo', H.cyan, 30);
  stat(s, 8.15, 3.05, 4.6, 1.35, '< 3 s', 'para cargar el Dashboard', H.amber, 30);
  stat(s, 8.15, 4.65, 4.6, 1.4, 'HU-20', 'Grupo Alfa Servicios · Plan de pruebas del EX01', H.green, 30);
  pieDiapo(s, 'Ignacio', n);
  notas[n] = `IGNACIO (1 min 30 s)
El sistema es OrangeHRM 5.9, un sistema de recursos humanos de código abierto. En el Examen I lo planteamos para un cliente ficticio, Grupo Alfa Servicios.
La historia HU-20 dice que el Dashboard, la pantalla principal después del login, tiene que cargar en menos de 3 segundos con 50 usuarios al mismo tiempo. Ese es el criterio que vamos a medir.
¿Por qué 50 al mismo tiempo? Porque es el momento crítico: la hora de entrada, cuando todos inician sesión casi a la vez.`;

  // ---------- 5. Ética ----------
  s = nueva('Conceptos y contexto');
  titulo(s, 'No probamos carga en un sistema ajeno');
  tarjeta(s, 0.6, 1.55, 4.6, 4.55, 'demo publica');
  s.addImage({ data: I.globe, x: 2.4, y: 1.95, w: 1.0, h: 1.0, objectName: 'icono demo' });
  s.addText('Demo pública', { x: 0.9, y: 3.15, w: 4.0, h: 0.5, fontSize: 22, bold: true, color: H.text, align: 'center', margin: 0, isTextBox: true, objectName: 'demo titulo' });
  s.addText('opensource-demo.orangehrmlive.com', { x: 0.9, y: 3.65, w: 4.0, h: 0.4, fontSize: 13, color: H.muted, align: 'center', margin: 0, isTextBox: true, objectName: 'demo url' });
  s.addImage({ data: I.ban, x: 2.6, y: 4.3, w: 0.6, h: 0.6, objectName: 'icono no' });
  s.addText('La comparten muchas personas', { x: 0.9, y: 5.05, w: 4.0, h: 0.5, fontSize: 14, color: H.red, align: 'center', margin: 0, isTextBox: true, objectName: 'demo motivo' });
  s.addImage({ data: I.arrow, x: 5.45, y: 3.55, w: 0.55, h: 0.55, objectName: 'flecha' });
  captura(s, '03_docker_contenedores_orangehrm_g4.jpg', 6.25, 1.55, 6.5, 4.55, 'Docker Desktop: OrangeHRM 5.9 + MariaDB 10.11 en nuestra laptop, puerto 8200', { alt: 'Contenedores de OrangeHRM en Docker Desktop' });
  pieDiapo(s, 'Ignacio', n);
  notas[n] = `IGNACIO (1 min)
Una decisión importante: no lanzamos la carga contra la demo pública de OrangeHRM. Esa demo la usan muchas personas al mismo tiempo, y 50 usuarios virtuales la pueden poner lenta para todos. Además, los resultados no serían confiables porque no sabemos quién más la está usando.
Lo que hicimos fue montar nuestra propia copia con Docker, con la misma versión 5.9. Docker crea dos contenedores: uno con OrangeHRM y otro con la base de datos MariaDB. Así la prueba es ética y los números son nuestros.`;

  // ---------- 6. BlazeMeter ----------
  s = nueva('Conceptos y contexto');
  titulo(s, 'BlazeMeter: grabar el recorrido');
  captura(s, '03_grabacion_login_localhost_chrome.jpg', 0.6, 1.45, 7.6, 4.75, 'Grabación del login en Chrome contra la instancia local', { alt: 'Grabación del login con BlazeMeter' });
  captura(s, 'bz_popup.png', 8.5, 1.45, 4.25, 2.95, 'Extensión de Chrome, versión 6.6.10', { alt: 'Panel de grabación de BlazeMeter' });
  const pasos = [['1', 'Grabar'], ['2', 'Login + Dashboard'], ['3', 'Exportar YAML']];
  pasos.forEach((p, i) => {
    const y = 4.62 + i * 0.55;
    badge(s, p[0], 8.6, y, H.amber, 0.4);
    s.addText(p[1], { x: 9.15, y, w: 3.5, h: 0.4, fontSize: 16, color: H.text, margin: 0, isTextBox: true, valign: 'middle', objectName: 'paso ' + p[0] });
  });
  pieDiapo(s, 'Ignacio', n);
  notas[n = n] = `IGNACIO (1 min 30 s)
BlazeMeter es una plataforma de pruebas de rendimiento. Su extensión gratuita para Chrome graba lo que uno hace en el navegador y lo convierte en un script.
Santiago abrió Chrome, le dio grabar, inició sesión en OrangeHRM local y esperó a que cargara el Dashboard. La extensión anotó cada petición que el navegador mandó al servidor.
Al final se exporta: nosotros lo bajamos en formato YAML, que trae una parte para JMeter y otra para Selenium.
La pregunta es: ¿ese archivo ya sirve para la prueba de carga? La respuesta corta es no, y Santiago les explica por qué.`;

  // ---------- 7. La grabación no es el script ----------
  pres.addSection({ title: 'Del recorrido al script' });
  s = nueva('Del recorrido al script');
  titulo(s, 'La grabación no es el script');
  captura(s, 'yaml_grabacion.png', 0.6, 1.4, 7.5, 5.3, null, { alt: 'Fragmento del YAML exportado con cinco problemas marcados' });
  const probs = [
    ['1', 'Token fijo', 'Correlación'],
    ['2', 'Petición a Google', 'Se quitó'],
    ['3', '20 usuarios, 19 min', 'Parámetros: 50 · 30 s · 15'],
    ['4', 'Sin validaciones', 'Aserciones + límite de 3 s'],
    ['5', 'Pausa de 36 s', 'Pausas fijas de 2 s']
  ];
  probs.forEach((p, i) => {
    const y = 1.4 + i * 1.06;
    tarjeta(s, 8.35, y, 4.4, 0.9, 'problema ' + p[0]);
    badge(s, p[0], 8.52, y + 0.24, H.amber, 0.42);
    s.addText(p[1], { x: 9.1, y: y + 0.1, w: 3.55, h: 0.38, fontSize: 16, bold: true, color: H.text, margin: 0, isTextBox: true, valign: 'middle', objectName: 'problema texto ' + p[0] });
    s.addText('→ ' + p[2], { x: 9.1, y: y + 0.47, w: 3.55, h: 0.33, fontSize: 13, color: H.green, margin: 0, isTextBox: true, valign: 'middle', objectName: 'solucion ' + p[0] });
  });
  pieDiapo(s, 'Santiago', n);
  notas[n] = `SANTIAGO (1 min 30 s)
Este es el archivo que exportó BlazeMeter. Encontramos cinco problemas:
1. El token de seguridad quedó fijo. OrangeHRM genera uno nuevo cada vez que se abre el login, así que este ya no sirve. Lo resolvimos con correlación; lo explico en la siguiente diapositiva.
2. Chrome hizo una petición a google.com por su cuenta. Si la dejábamos, estaríamos midiendo a Google. Se quitó.
3. BlazeMeter trae su configuración por defecto: 20 usuarios durante 19 minutos. Nosotros necesitamos 50, con una rampa de 30 segundos y 15 vueltas.
4. No valida nada: si el login fallara, la petición igual contaría como exitosa. Agregamos aserciones y un límite de 3 segundos.
5. Grabó mis pausas reales, 36 segundos escribiendo la contraseña. Las cambiamos por pausas fijas de 2 segundos.
Conclusión: la grabación sirve para descubrir el flujo; el script de carga se construye a partir de ella.`;

  // ---------- 8. Correlación ----------
  s = nueva('Del recorrido al script');
  titulo(s, 'Correlación del token CSRF');
  const flujo = [['GET /auth/login', H.cyan], ['Token en el HTML', H.amber], ['Regular Expression Extractor', H.green], ['${token}', H.amber], ['POST /auth/validate', H.cyan]];
  flujo.forEach((f, i) => {
    const x = 0.6 + i * 2.5, w = 2.15;
    tarjeta(s, x, 1.4, w, 0.85, 'paso correlacion ' + i);
    s.addText(f[0], { x: x + 0.1, y: 1.4, w: w - 0.2, h: 0.85, fontSize: 14, bold: true, color: f[1], align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'paso correlacion texto ' + i });
    if (i < flujo.length - 1) s.addImage({ data: I.arrow, x: x + w + 0.08, y: 1.66, w: 0.3, h: 0.3, objectName: 'flecha ' + i });
  });
  captura(s, has('dt_token_real.png') ? 'dt_token_real.png' : 'dt_token.png', 0.6, 2.55, 5.6, 4.15, 'DevTools > Red: el token viaja dentro del HTML del login', { alt: 'DevTools con el token CSRF' });
  captura(s, 'jm_regex.png', 6.45, 2.55, 6.3, 2.6, 'JMeter: la expresión regular guarda el token en la variable "token"', { alt: 'Regular Expression Extractor en JMeter' });
  tarjeta(s, 6.45, 5.35, 6.3, 1.35, 'expresion');
  s.addText(':token="&quot;(.+?)&quot;"', { x: 6.7, y: 5.45, w: 5.8, h: 0.6, fontSize: 20, bold: true, color: H.amber, fontFace: 'Courier New', margin: 0, isTextBox: true, valign: 'middle', objectName: 'regex' });
  s.addText('Cada usuario virtual lee su propio token en cada vuelta', { x: 6.7, y: 6.05, w: 5.8, h: 0.5, fontSize: 14, color: H.muted, margin: 0, isTextBox: true, valign: 'middle', objectName: 'regex explicacion' });
  pieDiapo(s, 'Santiago', n);
  notas[n] = `SANTIAGO (2 min)
CSRF es un ataque en el que otro sitio manda formularios a nombre del usuario. Para evitarlo, OrangeHRM mete un token aleatorio en la página de login, y el login solo se acepta si se devuelve ese mismo token.
Con DevTools, en la pestaña Red, vimos que el token viene dentro del HTML de /auth/login, en un atributo :token del componente de login.
Correlación es tomar un dato dinámico de una respuesta y usarlo en la siguiente petición. En JMeter se hace con un Regular Expression Extractor: esta expresión busca lo que está entre las comillas del token y lo guarda en la variable token. Después el POST /auth/validate manda \${token} en vez del valor fijo.
Sin esto, los 50 usuarios fallarían el login desde el primer intento.`;

  // ---------- 9. Componentes del plan ----------
  s = nueva('Del recorrido al script');
  titulo(s, 'El plan de JMeter');
  captura(s, 'jm_arbol.png', 0.6, 1.4, 3.9, 5.3, null, { alt: 'Árbol del plan de JMeter' });
  const comps = [
    [I.users, 'Thread Group', '50 usuarios · rampa 30 s · 15 vueltas'],
    [I.server, 'Samplers HTTP', 'login, validate, 7 APIs, logout'],
    [I.filter, 'Regex Extractor', 'toma el token CSRF'],
    [I.list, 'Aserciones', '¿entró al Dashboard? ¿menos de 3 s?'],
    [I.cookie, 'Cookie Manager', 'una sesión por usuario'],
    [I.clock, 'Pausas', '2 s, como un usuario real'],
    [I.report, 'Reporte HTML', 'gráficas, percentiles y APDEX']
  ];
  comps.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 4.8 + col * 4.05, y = 1.4 + row * 1.37, w = 3.9, h = 1.2;
    tarjeta(s, x, y, w, h, 'componente ' + c[1]);
    s.addImage({ data: c[0], x: x + 0.22, y: y + 0.36, w: 0.48, h: 0.48, objectName: 'icono ' + c[1] });
    s.addText(c[1], { x: x + 0.9, y: y + 0.17, w: w - 1.05, h: 0.42, fontSize: 16, bold: true, color: H.text, margin: 0, isTextBox: true, valign: 'middle', objectName: 'nombre ' + c[1] });
    s.addText(c[2], { x: x + 0.9, y: y + 0.6, w: w - 1.05, h: 0.45, fontSize: 13, color: H.muted, margin: 0, isTextBox: true, valign: 'top', objectName: 'detalle ' + c[1] });
  });
  pieDiapo(s, 'Santiago', n);
  notas[n] = `SANTIAGO (1 min 15 s)
A la izquierda está el árbol real del plan. Cada pieza tiene una función:
- El Thread Group define cuántos usuarios virtuales hay: 50, que arrancan en 30 segundos y dan 15 vueltas cada uno.
- Los samplers son las peticiones: abrir el login, validar, las 7 APIs del Dashboard y cerrar sesión. Están agrupados en 4 transacciones, 01 a 04, para medir cada paso del usuario.
- El extractor que ya vimos.
- Las aserciones revisan que de verdad entró al Dashboard y que respondió en menos de 3 segundos. Si no, cuenta como error.
- El Cookie Manager le da a cada usuario su propia sesión, como si fueran 50 navegadores distintos.
- Las pausas de 2 segundos imitan a una persona.
- Y al final JMeter genera un reporte HTML con todas las gráficas.
Todo corre en modo consola con un script de PowerShell: primero una prueba de humo con 1 usuario y, solo si pasa, la carga.`;

  // ---------- 10. Escenario y corrida 1 ----------
  pres.addSection({ title: 'Resultados y hallazgo' });
  s = nueva('Resultados y hallazgo');
  titulo(s, 'Primero revisamos el escenario');
  tarjeta(s, 0.6, 1.5, 5.6, 4.6, 'corrida 1');
  s.addText('Corrida 1 · 3 vueltas', { x: 0.9, y: 1.75, w: 5.0, h: 0.45, fontSize: 18, bold: true, color: H.muted, margin: 0, isTextBox: true, objectName: 'corrida 1 titulo' });
  s.addText('28', { x: 0.9, y: 2.35, w: 5.0, h: 1.5, fontSize: 88, bold: true, color: H.red, margin: 0, isTextBox: true, valign: 'middle', objectName: 'corrida 1 valor' });
  s.addText('usuarios activos como máximo', { x: 0.9, y: 3.9, w: 5.0, h: 0.45, fontSize: 16, color: H.text, margin: 0, isTextBox: true, objectName: 'corrida 1 etiqueta' });
  s.addText('0 % de error, pero no eran 50 simultáneos', { x: 0.9, y: 4.6, w: 5.0, h: 0.8, fontSize: 14, color: H.muted, margin: 0, isTextBox: true, valign: 'top', objectName: 'corrida 1 nota' });
  s.addImage({ data: I.arrow, x: 6.4, y: 3.5, w: 0.55, h: 0.55, objectName: 'flecha corridas' });
  s.addShape('roundRect', { x: 7.15, y: 1.5, w: 5.6, h: 4.6, fill: { color: H.card2 }, line: { color: H.green, width: 1.5 }, rectRadius: 0.12, objectName: 'corrida 2' });
  s.addText('Corrida 2 · 15 vueltas', { x: 7.45, y: 1.75, w: 5.0, h: 0.45, fontSize: 18, bold: true, color: H.muted, margin: 0, isTextBox: true, objectName: 'corrida 2 titulo' });
  s.addText('50', { x: 7.45, y: 2.35, w: 5.0, h: 1.5, fontSize: 88, bold: true, color: H.green, margin: 0, isTextBox: true, valign: 'middle', objectName: 'corrida 2 valor' });
  s.addText('usuarios activos al mismo tiempo', { x: 7.45, y: 3.9, w: 5.0, h: 0.45, fontSize: 16, color: H.text, margin: 0, isTextBox: true, objectName: 'corrida 2 etiqueta' });
  s.addText('Rampa de 30 s · 143 s en total · ahora sí es el escenario del plan', { x: 7.45, y: 4.6, w: 5.0, h: 0.8, fontSize: 14, color: H.muted, margin: 0, isTextBox: true, valign: 'top', objectName: 'corrida 2 nota' });
  pieDiapo(s, 'Andres', n);
  notas[n] = `ANDRÉS (1 min 30 s)
Antes de mirar tiempos, revisamos si la prueba hizo lo que tenía que hacer.
En la primera corrida cada usuario daba 3 vueltas. Salió todo en verde, 0 % de error. Pero al revisar los datos vimos que como máximo hubo 28 usuarios activos al mismo tiempo: los primeros terminaban sus 3 vueltas, unos 16 segundos, antes de que la rampa de 30 segundos terminara de arrancar a los últimos. O sea, no estábamos probando 50 simultáneos.
La corregimos a 15 vueltas: cada usuario dura unos 80 segundos, así que entre el segundo 30 y el 80 están los 50 a la vez. La segunda corrida sí cumplió el escenario.
La lección: un resultado en verde no sirve si el escenario está mal.`;

  // ---------- 11. Resultados: gráficas del reporte ----------
  s = nueva('Resultados y hallazgo');
  titulo(s, 'Corrida 2: el reporte de JMeter');
  const rt = has('rep_rt_5s.png') ? 'rep_rt_5s.png' : 'raw_rt_over_time.png';
  const th = has('rep_threads_5s.png') ? 'rep_threads_5s.png' : 'raw_active_threads.png';
  captura(s, rt, 0.6, 1.4, 6.0, 3.85, has('rep_rt_5s.png') ? 'Response Times Over Time (cada 5 s): tiempo promedio por transacción' : 'Response Times Over Time (agrupado por minuto): tiempo promedio por transacción', { alt: 'Gráfica Response Times Over Time del reporte de JMeter' });
  captura(s, th, 6.75, 1.4, 6.0, 3.85, has('rep_threads_5s.png') ? 'Active Threads Over Time (cada 5 s): usuarios activos' : 'Active Threads Over Time (agrupado por minuto): usuarios activos', { alt: 'Gráfica Active Threads Over Time del reporte de JMeter' });
  const datos = [['10 500', 'peticiones', H.text], ['73 / s', 'peticiones por segundo', H.cyan], ['0,44 %', 'de error', H.red], ['143 s', 'de duración', H.amber]];
  datos.forEach((d, i) => {
    const x = 0.6 + i * 3.08;
    tarjeta(s, x, 5.45, 2.88, 1.25, 'dato ' + d[1]);
    s.addText(d[0], { x: x + 0.25, y: 5.53, w: 2.4, h: 0.62, fontSize: 28, bold: true, color: d[2], margin: 0, isTextBox: true, valign: 'middle', objectName: 'valor ' + d[1] });
    s.addText(d[1], { x: x + 0.25, y: 6.14, w: 2.4, h: 0.4, fontSize: 13, color: H.muted, margin: 0, isTextBox: true, valign: 'middle', objectName: 'etiqueta ' + d[1] });
  });
  pieDiapo(s, 'Andres', n);
  notas[n] = `ANDRÉS (1 min 30 s)
Estas dos gráficas salen directo del reporte HTML que genera JMeter.
A la derecha, los usuarios activos: suben durante la rampa, se quedan en 50 y bajan cuando cada uno termina sus 15 vueltas.${has('rep_threads_5s.png') ? '' : ' Ojo: este reporte agrupa los datos por minuto, por eso la curva se ve con pocos puntos y el máximo aparece en 49. El detalle cada 5 segundos lo mostramos en la diapositiva 13.'}
A la izquierda, el tiempo promedio de cada transacción. Las dos que más tardan son el login (02) y el Dashboard (03). Fíjense que los tiempos más altos aparecen justo cuando se llega a 50 usuarios.
En total fueron 10 500 peticiones en 143 segundos, unas 73 por segundo, y solo 0,44 % de error. Parece muy bien, pero en la siguiente diapositiva vemos dónde están esos errores.`;

  // ---------- 12. Tabla y APDEX ----------
  s = nueva('Resultados y hallazgo');
  titulo(s, 'Transacciones y APDEX');
  captura(s, 'rep_statistics_transacciones.png', 0.6, 1.4, 12.15, 2.95, 'Statistics del reporte: P95 del login 3,6 s y del Dashboard 3,3 s; 46 fallos, todos en el login', { alt: 'Tabla Statistics del reporte de JMeter' });
  stat(s, 0.6, 4.6, 2.6, 1.5, '0,990', 'APDEX total', H.green, 34);
  stat(s, 3.4, 4.6, 2.6, 1.5, '0,939', 'APDEX login', H.amber, 34);
  stat(s, 6.2, 4.6, 2.6, 1.5, '0,973', 'APDEX Dashboard', H.amber, 34);
  tarjeta(s, 9.0, 4.6, 3.75, 1.5, 'apdex explicacion');
  s.addText([
    { text: 'APDEX', options: { bold: true, color: H.text, breakLine: true } },
    { text: '1 = todos satisfechos', options: { breakLine: true } },
    { text: 'satisfecho ≤ 3 s · tolerable ≤ 6 s' }
  ], { x: 9.25, y: 4.7, w: 3.3, h: 1.3, fontSize: 14, color: H.muted, margin: 0, isTextBox: true, valign: 'middle', objectName: 'apdex texto' });
  pieDiapo(s, 'Andres', n);
  notas[n] = `ANDRÉS (1 min 30 s)
Esta es la tabla Statistics del reporte, solo con las 4 transacciones.
- Abrir el login y cerrar sesión son rápidos y sin errores.
- El login (02) tiene promedio de 1,6 s, pero el percentil 95 es 3,6 s: o sea, el 5 % más lento pasó el límite. Ahí están los 46 fallos, el 6,13 %.
- El Dashboard (03) promedia 1,4 s, pero su percentil 95 es 3,3 s.
El APDEX es un índice de satisfacción de 0 a 1. Lo configuramos así: hasta 3 s el usuario está satisfecho, hasta 6 s lo tolera y más de 6 s se frustra. 1 sería perfecto. El total da 0,990, pero el login baja a 0,939 y el Dashboard a 0,973.
El percentil 95 significa que el 95 % de las peticiones tardaron eso o menos.`;

  // ---------- 13. Análisis ----------
  s = nueva('Resultados y hallazgo');
  titulo(s, '¿Cuándo fallan los logins?');
  const serie = JSON.parse(fs.readFileSync(path.join(__dirname, 'serie5s.json'), 'utf8'));
  const lab = serie.map(r => String(r[0]));
  s.addChart([
    { type: pres.charts.BAR, data: [{ name: 'Usuarios activos', labels: lab, values: serie.map(r => r[1]) }], options: { chartColors: [H.card2], barGapWidthPct: 10 } },
    { type: pres.charts.LINE, data: [
      { name: 'Login: tiempo máximo (s)', labels: lab, values: serie.map(r => r[3]) },
      { name: 'Login: promedio (s)', labels: lab, values: serie.map(r => r[2]) },
      { name: 'Límite del plan: 3 s', labels: lab, values: serie.map(() => 3) }
    ], options: { chartColors: [H.red, H.cyan, H.amber], lineSize: 2.5, lineDataSymbol: 'none', secondaryValAxis: true, secondaryCatAxis: true } }
  ], {
    x: 0.6, y: 1.35, w: 8.6, h: 5.35,
    valAxes: [
      { showValAxisTitle: true, valAxisTitle: 'Usuarios activos', valAxisMinVal: 0, valAxisMaxVal: 60, valAxisLabelColor: H.muted, valAxisTitleColor: H.muted, valAxisLabelFontSize: 11, valAxisTitleFontSize: 11, valGridLine: { color: '26344F', size: 0.5 } },
      { showValAxisTitle: true, valAxisTitle: 'Tiempo del login (s)', valAxisMinVal: 0, valAxisMaxVal: 8, valAxisLabelColor: H.muted, valAxisTitleColor: H.muted, valAxisLabelFontSize: 11, valAxisTitleFontSize: 11, valGridLine: { style: 'none' } }
    ],
    catAxes: [
      { catAxisTitle: 'Segundos desde el inicio de la prueba', showCatAxisTitle: true, catAxisLabelColor: H.muted, catAxisTitleColor: H.muted, catAxisLabelFontSize: 10, catAxisTitleFontSize: 11, catGridLine: { style: 'none' } },
      { catAxisHidden: true }
    ],
    showLegend: true, legendPos: 'b', legendColor: H.text, legendFontSize: 11, legendFontFace: '+mn-lt',
    catAxisLabelFontFace: '+mn-lt', valAxisLabelFontFace: '+mn-lt',
    plotArea: { fill: { color: H.bg } }, objectName: 'grafico usuarios contra login'
  });
  stat(s, 9.45, 1.35, 3.3, 1.65, '46 de 46', 'errores entre el segundo 30 y el 50', H.red, 32);
  stat(s, 9.45, 3.2, 3.3, 1.65, '7,1 s', 'el login más lento, en el pico de entrada', H.amber, 32);
  stat(s, 9.45, 5.05, 3.3, 1.65, '1,35 s', 'promedio de POST /auth/validate-0 (servidor)', H.cyan, 32);
  s.addText('Datos: resultados.jtl de la corrida 2, agrupados cada 5 s', { x: 2.2, y: 6.93, w: 7.0, h: 0.32, fontSize: 11, color: H.muted, valign: 'middle', margin: 0, isTextBox: true, objectName: 'fuente grafico' });
  pieDiapo(s, 'Andres', n);
  notas[n] = `ANDRÉS (1 min 30 s)
Este gráfico lo armamos con el archivo de resultados de JMeter, agrupando cada 5 segundos. Las barras son los usuarios activos; la línea roja es el login más lento de cada tramo, la celeste el promedio y la amarilla el límite de 3 s.
Los 46 errores están todos entre el segundo 30 y el 50: justo cuando termina la rampa y los 50 usuarios hacen login casi al mismo tiempo. Ahí el login llegó a 7,1 s.
Después del segundo 55, con los mismos 50 usuarios activos, el sistema se estabiliza y el login no pasa de 3 s.
Todos los errores son por tiempo: el login funcionó, entró al Dashboard, pero tardó más de 3 s.
Dentro del login, la parte lenta es la validación en el servidor, POST /auth/validate-0, con 1,35 s promedio. Nuestra hipótesis, todavía sin confirmar, es que validar la contraseña y crear la sesión consume CPU y los logins simultáneos hacen fila.`;

  // ---------- 14. Veredicto ----------
  s = nueva('Resultados y hallazgo');
  titulo(s, 'Veredicto: cumple parcialmente');
  const crit = [['Dashboard, promedio', '1,4 s', true], ['Dashboard, P90', '1,9 s', true], ['Dashboard, P95', '3,3 s', false], ['Login > 3 s', '6,1 %', false]];
  crit.forEach((c, i) => {
    const y = 1.45 + i * 1.12;
    tarjeta(s, 0.6, y, 5.6, 0.95, 'criterio ' + c[0]);
    s.addImage({ data: c[2] ? I.check : I.xmark, x: 0.85, y: y + 0.22, w: 0.5, h: 0.5, objectName: 'resultado ' + c[0] });
    s.addText(c[0], { x: 1.55, y, w: 2.9, h: 0.95, fontSize: 16, color: H.text, margin: 0, isTextBox: true, valign: 'middle', objectName: 'criterio texto ' + c[0] });
    s.addText(c[1], { x: 4.35, y, w: 1.6, h: 0.95, fontSize: 24, bold: true, color: c[2] ? H.green : H.red, align: 'right', margin: 0, isTextBox: true, valign: 'middle', objectName: 'criterio valor ' + c[0] });
  });
  s.addText('Criterio HU-20: Dashboard < 3 s con 50 usuarios simultáneos', { x: 0.6, y: 5.95, w: 5.6, h: 0.5, fontSize: 13, color: H.muted, margin: 0, isTextBox: true, valign: 'middle', objectName: 'criterio hu20' });
  captura(s, 'jira_g4qa22_desc_c.png', 6.5, 1.45, 6.25, 3.75, 'G4QA-22 en Jira: estado Nuevo, con pasos, datos y evidencia', { alt: 'Defecto G4QA-22 en Jira' });
  captura(s, 'jira_g4qa22_sev_c.png', 6.5, 5.35, 6.25, 1.35, null, { alt: 'Severidad S3 Menor y prioridad Medium de G4QA-22' });
  pieDiapo(s, 'Ignacio', n);
  notas[n] = `IGNACIO (1 min)
Con esos datos, el veredicto contra el criterio de HU-20 es: cumple parcialmente.
- El promedio del Dashboard, 1,4 s, y el percentil 90, 1,9 s, cumplen.
- El percentil 95, 3,3 s, no cumple, y el 6,1 % de los logins pasó de 3 s.
En otras palabras: con 50 usuarios ya trabajando, el sistema responde bien; el problema es el pico de entrada, cuando todos inician sesión a la vez.
Lo registramos en Jira como el defecto G4QA-22, con severidad S3 (menor: el login funciona, pero lento) y prioridad media, vinculado a las historias HU-01 y HU-20. Tiene los pasos para reproducirlo, los datos y la evidencia.`;

  // ---------- 15. Limitaciones ----------
  s = nueva('Resultados y hallazgo');
  titulo(s, 'Limitaciones y recomendaciones');
  tarjeta(s, 0.6, 1.45, 5.3, 5.25, 'limitacion');
  s.addImage({ data: I.laptop, x: 2.65, y: 1.8, w: 1.2, h: 1.2, objectName: 'icono laptop' });
  s.addText('Todo en la misma laptop', { x: 0.9, y: 3.15, w: 4.7, h: 0.5, fontSize: 20, bold: true, color: H.text, align: 'center', margin: 0, isTextBox: true, objectName: 'limitacion titulo' });
  const piezas = [['JMeter', H.cyan], ['Docker', H.cyan], ['OrangeHRM + MariaDB', H.amber]];
  piezas.forEach((p, i) => {
    const y = 3.85 + i * 0.62;
    s.addShape('roundRect', { x: 1.5, y, w: 3.5, h: 0.48, fill: { color: H.card2 }, line: { color: p[1], width: 1 }, rectRadius: 0.24, objectName: 'pieza ' + p[0] });
    s.addText(p[0], { x: 1.5, y, w: 3.5, h: 0.48, fontSize: 14, color: p[1], bold: true, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'pieza texto ' + p[0] });
  });
  s.addText('El generador de carga le quitó recursos al servidor', { x: 0.9, y: 5.85, w: 4.7, h: 0.6, fontSize: 13, color: H.muted, align: 'center', margin: 0, isTextBox: true, objectName: 'limitacion nota' });
  const recs = [
    [I.server, 'JMeter en otra computadora', 'Descartar que el problema sea del ambiente'],
    [I.gauge, 'Medir el servidor', 'CPU y memoria con docker stats durante la prueba'],
    [I.chart, 'Prueba de picos', '10, 25 y 50 logins a la vez: ¿desde cuántos pasa de 3 s?']
  ];
  recs.forEach((r, i) => {
    const y = 1.45 + i * 1.8;
    tarjeta(s, 6.2, y, 6.55, 1.6, 'recomendacion ' + i);
    badge(s, i + 1, 6.45, y + 0.25, H.green, 0.45);
    s.addImage({ data: r[0], x: 11.9, y: y + 0.25, w: 0.55, h: 0.55, objectName: 'icono recomendacion ' + i });
    s.addText(r[1], { x: 7.15, y: y + 0.2, w: 4.6, h: 0.5, fontSize: 18, bold: true, color: H.text, margin: 0, isTextBox: true, valign: 'middle', objectName: 'recomendacion titulo ' + i });
    s.addText(r[2], { x: 7.15, y: y + 0.75, w: 4.6, h: 0.65, fontSize: 14, color: H.muted, margin: 0, isTextBox: true, valign: 'top', objectName: 'recomendacion texto ' + i });
  });
  pieDiapo(s, 'Andres', n);
  notas[n] = `ANDRÉS (1 min)
Hay que ser honestos con el ambiente: JMeter, Docker, OrangeHRM y la base de datos corrieron en la misma laptop. El generador de carga también consume CPU y memoria, así que parte de la lentitud podría ser nuestra y no de OrangeHRM.
Por eso no lo damos por confirmado. Recomendamos tres cosas:
1. Repetir la prueba con JMeter en otra computadora.
2. Medir CPU y memoria de los contenedores con docker stats mientras corre.
3. Hacer una prueba de picos controlada: 10, 25 y 50 logins al mismo tiempo, para saber desde cuántos usuarios se pasa de 3 s.`;

  // ---------- 16. Lecciones ----------
  s = nueva('Resultados y hallazgo');
  titulo(s, 'Lo que aprendimos');
  const lec = [
    [I.file, 'La grabación es el punto de partida', 'El script de carga necesita correlación, parámetros y validaciones'],
    [I.magnify, 'Verificar el escenario con datos', 'La corrida 1 estaba en verde, pero no tenía 50 simultáneos'],
    [I.bug, 'Un fallo encontrado vale más', 'G4QA-22 tiene datos, análisis y pasos para repetirlo'],
    [I.handshake, 'Ética y honestidad', 'Nada contra la demo pública; las limitaciones se dicen']
  ];
  lec.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.15, y = 1.5 + row * 2.6, w = 6.0, h = 2.4;
    tarjeta(s, x, y, w, h, 'leccion ' + i);
    s.addShape('ellipse', { x: x + 0.35, y: y + 0.4, w: 0.95, h: 0.95, fill: { color: H.card2 }, line: { color: H.card2, width: 0 }, objectName: 'circulo leccion ' + i });
    s.addImage({ data: l[0], x: x + 0.57, y: y + 0.62, w: 0.5, h: 0.5, objectName: 'icono leccion ' + i });
    s.addText(l[1], { x: x + 1.55, y: y + 0.35, w: w - 1.85, h: 0.85, fontSize: 19, bold: true, color: H.text, margin: 0, isTextBox: true, valign: 'middle', objectName: 'leccion titulo ' + i });
    s.addText(l[2], { x: x + 1.55, y: y + 1.25, w: w - 1.85, h: 0.85, fontSize: 14, color: H.muted, margin: 0, isTextBox: true, valign: 'top', objectName: 'leccion texto ' + i });
  });
  pieDiapo(s, 'Santiago', n);
  notas[n] = `SANTIAGO (1 min)
Cuatro cosas que nos llevamos:
1. Grabar no es lo mismo que tener un script. BlazeMeter ahorra tiempo para descubrir el flujo, pero el script de carga hay que construirlo: correlación, parámetros y validaciones.
2. Hay que verificar el escenario con datos. La primera corrida salió perfecta y estaba mal planteada.
3. Encontrar un fallo es el objetivo de probar. Un reporte todo en verde no dice mucho; G4QA-22 sí aporta.
4. Ética y honestidad: no cargamos un sistema ajeno y decimos claramente las limitaciones de nuestro ambiente.
Ahora vamos a la demo.`;

  // ---------- 17. Demo ----------
  pres.addSection({ title: 'Demo y cierre' });
  s = nueva('Demo y cierre');
  titulo(s, 'Demo en vivo');
  const dem = [
    ['a', 'El plan en JMeter', 'Extractor del token y aserciones', I.eye],
    ['b', 'Prueba de humo', '1 usuario, en vivo', I.play],
    ['c', 'Reporte de la corrida 2', 'Las gráficas de los 50 usuarios', I.report]
  ];
  dem.forEach((d, i) => {
    const y = 1.5 + i * 1.75;
    tarjeta(s, 0.6, y, 5.0, 1.55, 'demo ' + d[0]);
    badge(s, d[0], 0.85, y + 0.5, H.cyan, 0.55);
    s.addText(d[1], { x: 1.65, y: y + 0.22, w: 3.2, h: 0.55, fontSize: 19, bold: true, color: H.text, margin: 0, isTextBox: true, valign: 'middle', objectName: 'demo titulo ' + d[0] });
    s.addText(d[2], { x: 1.65, y: y + 0.8, w: 3.6, h: 0.5, fontSize: 14, color: H.muted, margin: 0, isTextBox: true, valign: 'top', objectName: 'demo texto ' + d[0] });
    s.addImage({ data: d[3], x: 4.85, y: y + 0.5, w: 0.5, h: 0.5, objectName: 'icono demo ' + d[0] });
  });
  captura(s, 'jm_humo_resumen.png', 5.9, 1.5, 6.85, 3.2, 'Ensayo del 30/10: 14 muestras, 0 % de error (Summary Report)', { alt: 'Reporte resumen de la prueba de humo en JMeter' });
  tarjeta(s, 5.9, 4.9, 6.85, 1.85, 'aviso demo');
  s.addImage({ data: I.shield, x: 6.15, y: 5.35, w: 0.6, h: 0.6, objectName: 'icono aviso' });
  s.addText('No corremos los 50 usuarios en vivo: tarda y puede afectar el equipo del aula. Si algo falla, tenemos el video de respaldo.', { x: 7.0, y: 5.0, w: 5.5, h: 1.65, fontSize: 14, color: H.text, margin: 0, isTextBox: true, valign: 'middle', objectName: 'aviso texto' });
  pieDiapo(s, 'Santiago', n);
  notas[n] = `SANTIAGO (4 min) — seguir el guion de la demo (PR02_guion_demo.md)
a) JMeter abierto con G4_demo_humo_gui.jmx: mostrar el árbol, el extractor y las dos aserciones del login (≈1 min).
b) Darle Run (triángulo verde). Mostrar "Ver árbol de resultados" en verde y el "Reporte resumen": 14 muestras, 0 % de error (≈1 min 30 s).
c) Pasar al navegador con el reporte HTML de la corrida 2: Dashboard (APDEX y Statistics) y Charts > Over Time (≈1 min 30 s).
Frase para abrir: "No vamos a correr los 50 usuarios aquí porque tarda más de dos minutos y le exige mucho al equipo; corremos la prueba de humo, que es el mismo plan con un usuario, y después abrimos el reporte de la corrida real."
Si algo falla: decirlo con calma y poner el video del plan B.`;

  // ---------- 18. Bibliografía ----------
  s = nueva('Demo y cierre');
  titulo(s, 'Bibliografía');
  const bib = [
    ['The Apache Software Foundation. (2024). ', 'Apache JMeter: User\'s manual', '. https://jmeter.apache.org/usermanual/index.html'],
    ['The Apache Software Foundation. (2024). Generating dashboard report. En ', 'Apache JMeter: User\'s manual', '. https://jmeter.apache.org/usermanual/generating-dashboard.html'],
    ['The Apache Software Foundation. (s. f.). Component reference. En ', 'Apache JMeter: User\'s manual', '. https://jmeter.apache.org/usermanual/component_reference.html'],
    ['BlazeMeter Support. (2026, 27 de octubre). ', 'The BlazeMeter Chrome extension: Record JMeter, Selenium, or synchronized JMeter and Selenium', '. BlazeMeter. https://help.blazemeter.com/docs/guide/recorders-blazemeter-chrome-extension.html'],
    ['International Software Testing Qualifications Board. (2018). ', 'Certified Tester Foundation Level Specialist syllabus: Performance testing', ' (Versión 2018). https://www.istqb.org/wp-content/uploads/2024/11/ISTQB-CT-PT_Syllabus_v1.0_2018.pdf'],
    ['International Software Testing Qualifications Board. (2024). ', 'Certified Tester Foundation Level syllabus', ' (Versión 4.0.1). https://www.istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf'],
    ['OrangeHRM. (s. f.). ', 'orangehrm/orangehrm', ' [Repositorio de código fuente]. GitHub. https://github.com/orangehrm/orangehrm'],
    ['OrangeHRM. (s. f.). ', 'orangehrm/orangehrm', ' [Imagen de Docker]. Docker Hub. https://hub.docker.com/r/orangehrm/orangehrm']
  ];
  const runs = [];
  bib.forEach((b, i) => {
    runs.push({ text: b[0], options: {} });
    runs.push({ text: b[1], options: { italic: true } });
    runs.push({ text: b[2], options: { breakLine: i < bib.length - 1 } });
  });
  tarjeta(s, 0.6, 1.35, 12.15, 5.4, 'bibliografia');
  s.addText(runs, { x: 0.9, y: 1.5, w: 11.6, h: 5.1, fontSize: 12, color: H.text, margin: 0, isTextBox: true, valign: 'top', paraSpaceAfter: 7, indent: 0, objectName: 'referencias' });
  pieDiapo(s, 'Andres', n);
  notas[n] = `ANDRÉS (15 s)
Estas son las fuentes que usamos, en formato APA 7: la documentación oficial de JMeter y de BlazeMeter, los programas de ISTQB de nivel básico y de pruebas de rendimiento, y la documentación de OrangeHRM. Muchas gracias; quedamos atentos a sus preguntas.`;

  // Notas del orador
  pres._slides.forEach((sl, i) => { if (notas[i + 1]) sl.addNotes(notas[i + 1]); });

  const out = path.join(__dirname, 'PR02_JMeter_BlazeMeter_Grupo4.pptx');
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  fs.writeFileSync(path.join(__dirname, 'notas.json'), JSON.stringify(notas, null, 1));
  console.log('ok', out, n);
}
main().catch(e => { console.error(e); process.exit(1); });
