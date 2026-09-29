# Fractura en Acode: comprobaciones de esta versión

La compilación de GitHub Actions (`fractura-para-acode`) incluye los submódulos públicos de recursos e idiomas. Descomprimí el ZIP fuera de Acode y abrí `index.html` en la vista previa local. Conservá siempre la misma carpeta y el almacenamiento de Acode al actualizar: el perfil permanente (brújula y colores del rival) se guarda en el navegador local y todavía no forma parte del exportador de partidas.

- Oleada 20: elegí «Atender a los heridos». Debe otorgar Amuleto Shiny y activar el evento del viajero en la oleada 40. Las otras decisiones llevan a eventos diferentes en la oleada 40.
- Oleada 21 o cualquier salida con varias rutas: las tres tarjetas deben quedar separadas; al tocar cada una, la descripción aparece debajo. Campamento entrega Amuleto EXP, hallazgo entrega Voucher y peligro entrega Voucher Plus con clima adverso.
- Ruleta: los números del círculo corresponden a los diez premios escritos a la derecha. La brújula se conserva entre partidas y entrega un Voucher adicional en la oleada 10 de cada run clásica. Los colores Índigo y Cobre se desbloquean al ganarlos y se eligen con ←/→ en la ruleta. Un premio permanente repetido se convierte en Voucher Plus.
- Al aparecer el rival, comprobar el color seleccionado. Se trata de un cambio de color del sprite existente; todavía no hay ropa nueva dibujada.
- En una partida nueva, oleada 15: elegí una especialidad. Crítico aumenta la probabilidad de crítico, Lluvia cambia el clima de los combates normales y Reserva cura al equipo cada diez oleadas superadas.
- Oleada 25: elegí una reliquia global (fuego +20%, agua +20% o daño recibido -10%). Probarla con dos Pokémon distintos y confirmar que solo afecta a tu equipo. Estos efectos duran la run, no se conservan entre partidas.
- Oleadas 55 y 95: tras los combates con el rival, la tregua permite acercamiento romántico opcional, amistad o distancia. El reencuentro de la 95 aparece solo si elegiste tregua. No hay escenas de vídeo ni sprites nuevos todavía.
- Los textos largos de las decisiones avanzan por páginas con A; comprobar que se lee el final de cada introducción y consecuencia antes de elegir o continuar.

Para compilar localmente desde el repositorio, se necesitan los submódulos: `git submodule update --init --recursive`, `pnpm install` y `pnpm build`.
