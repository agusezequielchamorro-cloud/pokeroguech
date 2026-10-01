# Fractura 3 · Un mundo vivo

Esta versión se prepara para la instalación local que ya funciona en Acode. No necesitás Codespaces ni programar en el celular para jugar.

## Actualizar en Android

1. Exportá tu partida desde **Gestionar datos** y guardá la copia.
2. Extraé **fractura-3-actualizacion-acode.zip** dentro de la carpeta donde está el juego instalado. Combiná las carpetas y reemplazá los archivos coincidentes. Conservá las carpetas de imágenes, audio, fuentes y traducciones de tu instalación completa.
3. Abrí el mismo **index.html** desde el mismo servidor y dirección de Acode. Recargá. No borres los datos de la aplicación: el guardado del navegador depende de esa dirección.
4. Continuar conserva tu rival, historia y decisiones. Para conocer otro rival, iniciá una partida clásica en otro espacio de guardado. Los capítulos completados no se repiten al actualizar.

## Qué incorpora

- Cuatro rivales adultos: Elian, Vera, Nadir y Alma. Sus sprites propios reemplazan al rival original en sus seis encuentros de combate. Cada nueva partida evita repetir al rival de la anterior.
- Dieciséis poses originales, entradas animadas, respiración, cambios de gesto, pequeñas partículas y transiciones de escenario.
- Conversaciones entre vos y tu rival, con respuestas a tus elecciones y texto paginado. Tocar al personaje o al objeto de la escena permite avanzar.
- Encuentros contextuales por heridas, llegada a una ruta, terminales y ruinas. Respetan los eventos nativos y dejan al menos cuatro oleadas entre apariciones.
- Ayuda que recupera el 20% de los PS máximos de los Pokémon conscientes, sin revivir a los debilitados.
- Fondos propios para los 35 biomas, escenarios relacionados con las tres historias y dos fases visuales del jefe final. Las viejas placas de pasto desaparecen cuando están cargados estos fondos.
- Rutas con una imagen del bioma correspondiente, descripción y consecuencias legibles.
- Ruleta táctil: tocar un sector consulta su premio; deslizar y soltar inicia un giro. La fuerza cambia la animación, mientras cada premio conserva un 10% de probabilidad. El costo y el premio se guardan antes de animar para impedir duplicaciones.

Se conservan las builds, reliquias, mochila, casino, relaciones y cambios de Fractura 2. La historia sigue formada por tres familias escritas y variantes según semilla y decisiones; no requiere un servicio de IA. Las cinemáticas son escenas animadas del juego, sin vídeos externos.

## Arte y composición

Los cuatro nuevos atlas son originales y generados para Fractura:

- **rival-sprites.png**: cuatro personajes por cuatro poses.
- **arenas-natural.png**: dieciséis biomas naturales.
- **arenas-arcane.png**: dieciséis biomas industriales, místicos y extremos.
- **arenas-story.png**: isla, laboratorio, dos fases finales y doce localizaciones narrativas.

El fondo tiene suelo continuo y zonas despejadas cerca de los anclajes de combate existentes: jugador (106,148), rival (236,84). Los atlas usan sus dimensiones reales; la cámara conserva el espacio lógico de 320×180. Los retratos y el arte narrativo de la versión anterior permanecen para la interfaz.

## Verificación

La compilación de Android comprueba tipos con ambos submódulos, migración de guardados, cooldowns, escenas, recompensas únicas, sprites de cada rival, ruleta, huevos y recarga de combate. Un renderizador de QA usa el ajuste de texto real de Phaser para comprobar las variantes de diálogo y las pantallas de rutas/casino.

Las capturas de QA muestran la composición de la interfaz; no sustituyen una prueba en el Motorola. Queda por comprobar en el celular el rendimiento de los nuevos atlas, las animaciones y partidas largas.

Esta entrega no completa todavía todas las mecánicas de la lista original: las fusiones nuevas, evoluciones alternativas, ataques creados por componentes, generación de descendencia y base entre partidas requieren entregas posteriores.
