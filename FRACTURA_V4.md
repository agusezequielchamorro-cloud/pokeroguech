# Fractura 4 · Diálogos y expedición

Actualización para la instalación completa que ya funciona en Acode. El paquete pequeño sustituye el programa y el arte de Fractura; utiliza las imágenes, sonidos, fuentes y traducciones que ya tienes.

## Actualizar en Android

1. Exporta tu guardado desde **Gestionar datos** y conserva esa copia.
2. Extrae **fractura-4-actualizacion-acode.zip** en la misma carpeta del juego. Combina las carpetas y reemplaza los archivos coincidentes. Conserva los recursos de la instalación completa; no elimines la carpeta del juego.
3. Abre el mismo **index.html** con el mismo servidor y dirección de Acode, y recarga. No borres los datos de la aplicación.

**Continuar** conserva tu rival, tu historia y tus decisiones. Los capítulos ya completados no vuelven a entregar premios. Para conocer otro rival desde su presentación, inicia una partida clásica en otro espacio de guardado.

## Correcciones

- Las 16 poses de Elian, Vera, Nadir y Alma se recortan según sus márgenes reales, mantienen una escala común por personaje y apoyan los pies en el mismo punto. El sprite del rival seleccionado se usa en sus seis encuentros de combate.
- Se sustituyen los cambios rápidos de pose por entradas suaves, respiración discreta y transiciones de gesto. Los retratos pertenecen al mismo personaje que aparece en el campo.
- Las escenas ocultan las barras de combate y restauran su visibilidad original al terminar. La conversación sucede sobre el campo, con objetos propios, iluminación y efectos al tocarlos.
- El texto se pagina según el ancho real y el ajuste de Phaser, con un máximo de tres líneas por página. El botón B permite releer. Las respuestas del jugador y del rival aparecen como intervenciones separadas.
- Los capítulos usan español neutro y un guion explícito: quién habla, qué necesita y qué cambia con cada decisión. La compilación local selecciona las traducciones latinoamericanas disponibles del juego base.
- La ruleta conserva los premios, las probabilidades y los controles táctiles, con las descripciones y mensajes corregidos. La fuerza del gesto afecta a la animación, no a las probabilidades.

## Sistemas nuevos y ampliados

- **19 hitos narrativos**, incluyendo la especialidad del equipo en 15 y la reliquia en 25, con tres tramas: UMBRAL, invasión y eclipse. Las escenas de laboratorio, almacén y altar tienen objetivos diferentes.
- **Cuatro misiones personales.** Elian busca reconstruir la ruta de Saira; Vera identifica el sello de su archivo; Nadir reúne pruebas del registro de Mara; Alma busca a una caravana. Se ofrecen en 35 y pueden retomarse en 85 y 125. Las misiones activas con pruebas suficientes también pueden completarse en 175.
- **Permiso permanente de taller y recuerdos.** Compartir las pruebas termina la misión, registra el recuerdo del rival y reduce en una ficha el costo de las recetas, con un mínimo de una. La recompensa no se duplica al releer o recargar.
- **Taller con seis recetas:** Tónico, Sello, Señuelo, Remedio, Reserva de PP y Prisma. Usa fichas del juego y guarda los consumibles en la mochila permanente.
- **Remedio:** cura estados alterados de Pokémon conscientes. **Reserva de PP:** recupera hasta cuatro PP por movimiento de Pokémon conscientes. Si no hacen falta, se conserva el objeto. No reviven ni consumen un turno de combate.
- **Diario:** objetivo actual, estado de la misión personal y hasta 40 decisiones con consecuencias y conversación. Una partida antigua conserva sus decisiones anteriores; el registro detallado empieza con las decisiones tomadas en esta versión.
- **Relaciones con continuidad:** confianza, afecto y rivalidad cambian según las decisiones. El romance requiere elección explícita y suficiente cercanía; también puedes mantener una amistad, elegir una enemistad o terminar una relación.
- **Encuentros contextuales** desde la oleada 12, con siete oleadas de separación. Respetan los eventos nativos y los hitos principales. El tratamiento de heridas no revive a Pokémon debilitados.

## Verificación y alcance

La compilación comprueba tipos, reglas, migración de guardados, controles de las escenas, objetos, misión y recompensa única, taller, huevos y recarga de combate. El validador de interfaz usa el ajuste real de Phaser y el arte de producción, incluyendo misiones completadas y relaciones desarrolladas. Un validador independiente revisa las 16 poses y los 16 objetos de escena.

Las imágenes de QA muestran la composición; no sustituyen una prueba en el Motorola. Queda por verificar allí el rendimiento de partidas largas y las animaciones con el WebView de Acode.

Esta entrega conserva los fondos y los sistemas de combate de Fractura 3. Todavía no incorpora todas las ideas originales: ataques creados por componentes, nuevas fusiones, evoluciones alternativas, descendencia, base entre partidas, combates 3 contra 3 y finales con una cinemática posterior a la oleada 200 requieren entregas posteriores. La historia utiliza contenido escrito y variantes por semilla y decisiones, sin un servicio de IA externo.
