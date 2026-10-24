# DLS 26 PC — Cartas y fútbol arcade local

Proyecto web de fans en HTML, CSS y JavaScript. Conserva el catálogo de cartas (`dls26-cards.json`) y añade un partido de fútbol arcade en Canvas.

## Incluye
- Catálogo de jugadores con búsqueda, paginación y atributos.
- Partido contra CPU con dificultad fácil, media y difícil.
- Modo local de dos jugadores en el mismo teclado.
- Movimiento, sprint con resistencia, pase, disparo, tiro potente, entradas, goles, marcador, cronómetro, pausa y reinicio.
- Escudos seleccionables y campo dibujado por Canvas.
- Sin backend ni modo online: apto para GitHub Pages.

## Controles
**Jugador 1 (azul):** flechas para moverse, Espacio para disparar, Shift para pasar, Q para sprint, X para entrada, Z para tiro potente.

**Jugador 2 (rojo):** WASD para moverse, F para disparar, G para pasar, E para sprint, R para entrada, T para tiro potente.

Acércate al balón para controlarlo. La dirección del jugador determina hacia dónde pasa o dispara.

## Publicar en GitHub Pages
1. Crea un repositorio en GitHub.
2. Sube `index.html`, `styles.css`, `script.js`, `dls26-cards.json` y las imágenes incluidas. Mantén los nombres y las mayúsculas tal como están.
3. En el repositorio abre **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Selecciona `main` y la carpeta `/ (root)`, guarda y espera a que GitHub genere el enlace.
6. Abre el enlace publicado. La base JSON debe estar en la misma carpeta que `index.html`.

## Imágenes y música
Las cartas usan las rutas de imagen incluidas en el JSON. Si una imagen no está en el repositorio, la tarjeta mostrará un icono de balón en su lugar. La lista de música también está definida en el JSON, pero los archivos MP3 originales no se incluyeron en este paquete; añade los MP3 correspondientes si tienes derecho a usarlos.

## Notas
- Esta es una versión arcade 2D inspirada en juegos de fútbol; no reproduce todas las mecánicas de un simulador comercial profesional.
- Proyecto de fans no oficial, sin afiliación con First Touch Games, Dream League Soccer ni los clubes mostrados.
