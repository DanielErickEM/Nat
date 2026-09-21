# Nataly · Un universo de flores amarillas en 3D

Una sola escena automática a pantalla completa. HTML, CSS y JavaScript; GitHub Pages sirve todos los archivos directamente, sin un proceso de compilación para publicar.

## Escena

- WebGL con Three.js 0.180.0, incluido localmente en `assets/three-engine.js`.
- Pétalos modelados con superficies curvas, centros de girasol con semillas en espiral, rosas, margaritas y tulipanes.
- Iluminación cálida, materiales físicos, sol esférico con textura procedural animada, resplandor y partículas en profundidad.
- Cinco fotografías y un video silenciado en bucle, sobre marcos tridimensionales.
- Cámara automática, pétalos flotantes, mariposas, nebulosa y mensajes que cambian solos.
- Pausa, música opcional, movimiento suave cuando se solicita movimiento reducido y suspensión cuando la pestaña está oculta.
- Resolución ajustada a móviles y reducción automática del coste gráfico si el dispositivo no sostiene la animación.
- Modo Canvas compatible (`fallback.js`) si WebGL no está disponible.

## Archivos

`script.js` inicia la escena y selecciona el modo compatible si es necesario. `universe-3d.js` contiene la escena, medios, animación y controles. `flowers.js` genera las geometrías de flores. `styles.css` e `index.html` contienen la presentación.

Servir la carpeta con cualquier servidor HTTP para probar los módulos ES; GitHub Pages publica la rama `main` desde la raíz. No es necesario instalar npm para ver, editar o publicar.

La dependencia Three.js y sus módulos de postprocesado se distribuyen bajo la licencia MIT conservada en `assets/THREE-LICENSE.txt`.

Las fotografías y el video pertenecen a sus respectivos titulares; no se concede permiso para reutilizarlos.
