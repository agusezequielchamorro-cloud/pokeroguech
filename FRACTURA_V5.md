# Fractura 5: Forja, equipo y desenlace

La actualización conserva el motor de PokéRogue y las mejoras de Fractura 4: cuatro rivales originales, tres tramas, diálogos paginados en español neutro, escenas con animación, rutas ilustradas, misiones personales, Diario, Taller, consumibles y casino con recursos del juego.

## Forja de movimientos

Abre **Menú → Refugio Fractura → Forja** en una partida clásica cuando aparece el menú de combate. Elige el Pokémon, su movimiento, una forma, un sello y confirma. Las modificaciones y los fragmentos se guardan con la partida; terminan con esa expedición.

Ganas dos fragmentos cada diez oleadas superadas. La oleada 18 presenta la Forja y ofrece fragmentos adicionales. La vista previa no cobra. Repetir una combinación ya aplicada no cobra; retirarla es gratis. Reemplazarla paga el costo completo y no devuelve el anterior.

| Componente | Efecto | Costo |
| --- | --- | --- |
| Eco | Añade un impacto hasta un máximo de cinco. Cada impacto usa 65% de la potencia original. | 2 |
| Precisión | Aumenta un nivel de probabilidad de crítico. | 2 |
| Vital | Cura 6% de PS máximos tras causar daño, una vez por uso. Protección cura 10% si funciona. | 2 |
| Chispa / Ascua / Toxina | Cada impacto que causa daño tiene 10% de probabilidad de paralizar / quemar / envenenar. | 2 |
| Sin forma / Sin sello | Conserva la parte original correspondiente. | 0 |

Una forma y un sello cuestan cuatro fragmentos. Conservan el tipo y los PP originales. La modificación solo afecta al Pokémon elegido y ese movimiento, aunque otro miembro conozca el mismo ataque. Los estados respetan inmunidades, habilidades y el Sustituto. La curación respeta el bloqueo de curación y no revive.

Por ahora se admiten ataques de un solo objetivo e impacto, sin carga, daño fijo ni mecánicas especiales de ejecución diferida, además de Protección con Vital. La interfaz identifica los incompatibles y conserva tus fragmentos. No se añaden ataques completamente nuevos ni rebotes en esta versión.

## Sinergias de equipo

En **Refugio Fractura → Equipo** puedes ver cuántos miembros conscientes cumplen cada condición. Un Pokémon de dos tipos puede contar para dos formaciones; uno debilitado no cuenta. Los efectos se aplican en modo clásico.

| Formación | Requisito | Efecto |
| --- | --- | --- |
| Marea | Tres Pokémon de Agua conscientes | Lluvia de cinco turnos al empezar un combate sin otro clima. Las habilidades y objetos del motor pueden modificarla. |
| Bosque | Tres Pokémon de Planta conscientes | Los miembros activos recuperan 1/64 de PS máximos al terminar cada turno. |
| Fortaleza | Tres Pokémon de Acero conscientes | Todo el equipo recibe 5% menos daño de ataques. |
| Toxina | Tres Pokémon de Veneno conscientes | Los ataques del equipo causan 20% más daño a enemigos envenenados. |

## Desenlace

Después de ganar la oleada 200 aparece un epílogo. Cambia con la trama, el plan elegido antes del combate final y la relación con el rival: amistad, romance opcional o enemistad. La decisión de cierre registra permanentemente la historia completada. Puedes consultar los finales descubiertos en el Diario cuando no hay expedición activa.

## Actualizar en Acode

Exporta una copia de tu partida desde el menú del juego. Cierra la vista previa, extrae el ZIP de actualización con el administrador de archivos y reemplaza sus archivos dentro de la misma carpeta del juego. Conserva las carpetas grandes de recursos, idiomas y sonidos. Abre el mismo `index.html` desde Acode y recarga.

El ZIP pequeño es una actualización de una instalación completa de Fractura; no funciona solo en una carpeta vacía. No es necesario compilar, abrir Codespaces ni subir los recursos desde el celular. Conserva el almacenamiento de Acode para mantener el perfil permanente.

## Alcance pendiente

Todavía faltan sistemas completos de fusiones temporales propias de Fractura, evoluciones alternativas por acciones, personalidades, condiciones especiales de captura, criaturas mutantes, objetivos de run variables, reglas mundiales de Endless, descendencia y una base ampliable entre partidas. Los combates 3v3 y la creación libre de ataques requieren cambios adicionales en el motor. La narración actual usa tramas y decisiones ramificadas; todavía no genera historias ilimitadas.
