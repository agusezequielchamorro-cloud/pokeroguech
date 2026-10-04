# Verificación de Fractura 5

## Comprobaciones automatizadas

- `node qa/validate-rules.mjs`: generación de rivales y tramas, migración de guardados, decisiones y efectos de Fractura.
- `pnpm exec tsc -p scripts/tsconfig.json --noEmit`: tipos del juego y sus herramientas.
- `pnpm exec vitest run --maxWorkers=2 --silent=passed-only`: pruebas del motor, fases, controles, compras, guardados y nuevas mecánicas.
- `node qa/validate.mjs`: distribución y paginación con las imágenes reales y medidas de texto. Requiere `@napi-rs/canvas`.
- `pnpm build`: compilación con los submódulos públicos completos de recursos e idiomas.

El flujo `publish-fractura.yml` ejecuta estas comprobaciones antes de crear los ZIP completo y de actualización. Una prueba sin interfaz no sustituye a probar el dispositivo Android real.

## Prueba en Acode

Actualiza la misma instalación siguiendo [FRACTURA_V5.md](FRACTURA_V5.md) y conserva el almacenamiento de la vista previa.

1. Continúa una partida guardada y confirma equipo, rival, decisiones y objetos.
2. En el menú de combate abre Menú → Refugio Fractura → Forja. Comprueba los cinco pasos con toque y A/B; B debe retroceder sin cobrar.
3. Modifica un ataque compatible con Eco y comprueba dos impactos con un solo gasto de PP. Otro Pokémon con el mismo movimiento conserva su ataque original.
4. Comprueba Precisión, Vital y un sello. Vital no cura si el ataque falla, no revive y respeta el bloqueo de curación. Un sello respeta inmunidades y habilidades.
5. Repite una combinación ya aplicada y comprueba que no cobra. Selecciona un ataque incompatible o una combinación sin fondos: conserva el movimiento y los fragmentos. Retira la modificación gratis.
6. Guarda y recarga en la misma carpeta: deben permanecer la modificación y los fragmentos. No deben repetirse los premios de cada diez oleadas.
7. Abre Equipo con tres miembros conscientes de Agua, Planta, Acero o Veneno. Comprueba su efecto en el combate. Al debilitar al tercero deben desaparecer las formaciones que requieren su participación. Marea no sustituye un clima ya existente.
8. La oleada 18 presenta la Forja. Los textos deben leerse completos con A, sin tapar botones ni opciones.
9. Después de ganar la oleada 200 completa el epílogo, comprueba el final registrado en el Diario sin expedición activa y que no se duplica al recargar.
10. Comprueba una partida nueva con otro rival y las funciones anteriores: rutas, ruleta, Taller, misiones, consumibles y diálogos.

No borres datos de Acode para actualizar. El ZIP pequeño necesita la instalación completa anterior y no incluye de nuevo los recursos grandes.
