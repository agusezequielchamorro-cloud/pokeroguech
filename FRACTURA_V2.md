# Fractura 2 — Historias del camino

Esta versión se ejecuta en Acode igual que la anterior. No requiere Codespaces para jugar.

- Rutas ilustradas, nombres legibles y confirmación separada. Cada camino explica su recompensa y su riesgo.
- Cuatro rivales adultos: Elian, Vera, Nadir y Alma. Cada nueva run clásica genera uno; continuar conserva el elegido.
- Tres familias de historia: proyecto UMBRAL, ciudad sitiada y dios del eclipse. Las decisiones anteriores cambian escenas y recompensas posteriores.
- Confianza, afecto y enemistad. El romance es opcional. Con enemistad 55 o superior, el rival causa 15% más daño con sus ataques normales.
- Escenas con retratos originales, fondos, entrada animada y texto paginado. Son cinemáticas del motor, sin archivos de video.
- Casino por pestañas: Ruleta, Sol/Luna, Mochila y Vínculo. Diez premios equiprobables (10% cada uno); Sol/Luna cuesta una ficha y tiene 50% de acierto. Solo usa recursos ficticios del juego.
- Mochila permanente: Tónico, Señuelo prisma, Sello protector y Prisma de reinvención. Se usan cuando está abierto el menú de comandos del combate en una run clásica.
- La build Reserva vital ahora cura 1/32 de los PS al final de cada turno. La curación anterior cada diez oleadas coincidía con el descanso normal y aportaba poco.
- Run e inventario Fractura incluidos en las exportaciones de datos. Se migran las builds, reliquias, paletas y decisiones anteriores.

## Cuándo aparecen las escenas

Oleadas 1, 8, 10, 15, 20, 25, 30, 40, 49, 55, 60, 75, 95, 145 y 195, después del combate. Las oleadas 15 y 25 mantienen la elección de build y reliquia. El clima de la oleada 50 responde a la decisión de la 49 y a los rescates/sabotajes anteriores. Cada diez oleadas se ganan dos fichas adicionales.

En una partida que ya está avanzada solo aparecerán las escenas futuras. Para conocer el inicio y comprobar la variedad de rival e historia, empezá una nueva partida clásica en otro slot.

## Actualizar en Android

1. Exportá los datos desde el menú del juego como respaldo.
2. Descargá `fractura-actualizacion-acode` de la compilación terminada.
3. Extraé su contenido **sobre la misma carpeta** del juego actual, aceptando reemplazar `index.html`, `asset-manifest.json` y combinar `assets`. No borres las carpetas de imágenes, sonidos, fuentes o idiomas.
4. Abrí el mismo `index.html` en Acode y recargá su vista previa.

El archivo `fractura-para-acode` sigue disponible para una instalación completa.

## Validación y alcance

`node qa/validate-rules.mjs` verifica generación por semilla, las doce combinaciones de rival/historia, decisiones, migración y probabilidades. La compilación exige además comprobar los tipos de todo el proyecto.

Las cuatro ilustraciones son retratos para las escenas; en combate se usan los sprites base con género y paleta del rival. Las historias tienen capítulos escritos que se combinan con el rival y tus decisiones; no generan diálogos con IA durante el juego. La partida conserva la estructura clásica hasta la oleada 200. Fusiones temporales, creador de ataques, monstruos mutantes y base entre runs siguen pendientes.
