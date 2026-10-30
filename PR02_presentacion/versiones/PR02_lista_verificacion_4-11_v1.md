# PR02 — Lista de verificación para la mañana del 4/11

## La noche anterior (3/11)

- [ ] La presentación final está en `06_PRUEBAS_REALES\PR02_presentacion\` y también en USB y en la nube.
- [ ] Las 3 capturas de DevTools están en la diapositiva 8 (no debe quedar ningún recuadro "CAPTURA PENDIENTE").
- [ ] El video del plan B está grabado, revisado (se ve y se escucha bien) y copiado en USB y en la nube.
- [ ] Ensayo completo con cronómetro: entre 22 y 24 minutos. Cada uno sabe cuándo le toca (ver la tabla de reparto en `PR02_notas_del_orador.md`).
- [ ] Andrés e Ignacio leyeron el glosario y las preguntas probables (`PR02_preguntas_probables.md`).
- [ ] Laptop cargada y cargador en el bulto.

## En la mañana, antes de salir

- [ ] Encender la laptop y correr:
  ```powershell
  powershell -ExecutionPolicy Bypass -File "C:\Users\SantiagoMontero\Universidad\Calidad de Software\06_PRUEBAS_REALES\scripts\pr02_demo.ps1" -Humo
  ```
- [ ] Termina con `LISTO PARA LA DEMO`. La prueba de humo da 0 % de error.
- [ ] Se abrieron JMeter (con `G4_demo_humo_gui.jmx`) y el reporte de la corrida 2.
- [ ] Cerrar JMeter sin guardar (si pregunta, "No"), para llegar con todo limpio.

## En el aula, 10 minutos antes

- [ ] Conectar la laptop al proyector y revisar que se vea (Win + P → Duplicar).
- [ ] Desactivar notificaciones: Win + N → **No molestar**. Cerrar Teams, WhatsApp y el correo.
- [ ] Volver a correr `pr02_demo.ps1` (sin `-Humo` alcanza). Docker tarda hasta 1–2 minutos en arrancar.
- [ ] En JMeter: desplegar el árbol, **Run → Clear All**, dejar seleccionado `Extraer token CSRF del login`.
- [ ] En el navegador: el reporte de la corrida 2 abierto en **Dashboard**. Zoom del navegador al 125 % para que se lea desde atrás.
- [ ] PowerPoint abierto en la diapositiva 1. Probar Alt+Tab entre PowerPoint, JMeter y el navegador.
- [ ] El video del plan B abierto y en pausa, listo para reproducir.

## Si falla algo justo antes

| Síntoma | Solución rápida |
|---|---|
| `[FALLA] Docker responde` | Abrir Docker Desktop a mano, esperar a que diga *Engine running* y volver a correr el script |
| `[FALLA] La pagina de login responde 200` | Esperar 1 minuto (la base de datos tarda) y volver a correr. Si sigue, plan B |
| La prueba de humo da error | Revisar que OrangeHRM abra en el navegador (`http://localhost:8200`). Si abre pero la prueba falla, plan B |
| No hay proyector o no conecta | Presentar desde la computadora del aula con la copia en USB y usar el video |
