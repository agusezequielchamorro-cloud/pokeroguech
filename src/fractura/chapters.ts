import { personalMissionReady } from "./journal";
import { getPersonalChapter, PERSONAL_HISTORY } from "./quests";
import { changeRelationship, type FracturaRunState, getRival, STORIES } from "./run-state";
import type { FracturaStoryChoice, FracturaStoryEvent } from "./story";
export const FRACTURA_EVENT_WAVES = [
  1, 8, 10, 15, 18, 20, 25, 30, 35, 40, 49, 55, 60, 75, 85, 95, 125, 145, 175, 195, 200,
];
const trust = (s: FracturaRunState) => changeRelationship(s, 16, 5, -8);
const oppose = (s: FracturaRunState) => changeRelationship(s, -10, 0, 24);
const choose = (
  label: string,
  spoken: string,
  reply: string,
  resultText: string,
  hint: string,
  apply: FracturaStoryChoice["apply"],
  extra: Partial<FracturaStoryChoice> = {},
): FracturaStoryChoice => ({ label, spoken, reply, resultText, hint, apply, ...extra });
const QUESTIONS: Record<number, string> = {
  1: "¿Cómo quieres empezar esta expedición?",
  8: "¿Qué harás ante el puente roto?",
  10: "¿Qué vas a priorizar en este cruce?",
  15: "¿Cómo quieres preparar al equipo?",
  18: "¿Cómo quieres aprovechar los fragmentos?",
  20: "¿Cómo quieres aprovechar el descanso?",
  25: "¿Qué reliquia llevará tu equipo?",
  30: "¿Qué vas a recuperar primero?",
  40: "¿Qué necesitas antes de continuar?",
  49: "¿Cómo prepararemos el próximo combate?",
  55: "¿Qué relación quieres construir conmigo?",
  60: "¿Qué harás con esta abertura?",
  75: "¿Cómo quieres usar los suministros?",
  95: "¿Cómo vamos a coordinar nuestras rutas?",
  145: "¿Cómo revisaremos el acceso principal?",
  175: "¿Qué quieres conservar cuando termine el viaje?",
  195: "¿Qué plan ejecutaremos después del combate?",
  200: "¿Qué quieres hacer al terminar la expedición?",
};
export function getFracturaChapter(wave: number, state: FracturaRunState): FracturaStoryEvent | undefined {
  const rival = getRival(state);
  const story = STORIES[state.storyId];
  const hostile = state.relationship.rivalry >= 55;
  const scene = (
    title: string,
    intro: string,
    opening: string,
    question: string,
    answer: string,
    choices: FracturaStoryChoice[],
    sceneProp = 4,
    environment: number = story.environment,
  ): FracturaStoryEvent => ({
    id: wave === 15 ? "fractura-build" : wave === 25 ? "fractura-relic" : "chapter-" + wave,
    afterWave: wave,
    title,
    intro,
    choices,
    environment,
    sceneProp,
    question: QUESTIONS[wave] ?? "¿Cómo quieres continuar?",
    speaker: rival.name,
    portrait: rival.frame,
    dialogue: [
      { speaker: "narrator", text: intro, pose: 0 },
      { speaker: "rival", text: opening, pose: hostile ? 2 : 1 },
      { speaker: "player", text: question, pose: 0 },
      { speaker: "rival", text: answer, pose: 1, effect: [10, 49, 60, 195].includes(wave) ? "signal" : undefined },
    ],
  });
  if ([35, 85, 125].includes(wave)) {
    return getPersonalChapter(wave, state);
  }
  if (wave === 18) {
    return scene(
      "El banco de runas",
      "Una artesana recoge su banco de trabajo junto al camino. Tu rival te muestra los fragmentos que ha separado de una reliquia rota.",
      "No necesitamos cambiar de Pokémon para intentar algo distinto. Podemos preparar un movimiento con una forma y un sello.",
      "¿Voy a perder el movimiento original?",
      "No. Mantiene su tipo y sus PP, y puedes retirar la modificación gratis. La forma cambia cómo funciona; el sello puede causar un estado alterado.",
      [
        choose(
          "Preparar la primera combinación",
          "Quiero probar una forma y un sello juntos.",
          "Te dejo cuatro fragmentos. Elige el Pokémon y confirma la combinación en Forja cuando aparezca el menú de combate.",
          "Recibes 4 fragmentos para esta partida. Abre Menú → Refugio Fractura → Forja. Cada 10 oleadas ganadas recibes 2 fragmentos más.",
          "+4 fragmentos · Forja",
          s => {
            s.forgeShards += 4;
          },
        ),
        choose(
          "Estudiar las runas",
          "Quiero entender las formas antes de elegir.",
          "Eco añade un impacto. Precisión mejora los críticos. Vital cura después del ataque. El sello es opcional.",
          "Recibes 3 fragmentos y una pista de investigación. Las modificaciones solo afectan al Pokémon y al movimiento que elijas.",
          "+3 fragmentos · +1 investigación",
          s => {
            s.forgeShards += 3;
            s.investigation++;
          },
        ),
        choose(
          "Preparar una defensa",
          "Quiero usar las runas para cuidar al equipo.",
          "Protección admite la forma Vital: si funciona, también recupera parte de tus PS. No la hace infalible.",
          "Recibes 2 fragmentos y un Sello protector. La Forja no elimina los riesgos ni las inmunidades del combate.",
          "+2 fragmentos · Sello",
          s => {
            s.forgeShards += 2;
          },
          { consumable: "shield" },
        ),
      ],
      4,
      3,
    );
  }
  if (wave === 200) {
    const aftermath =
      state.storyId === "umbral"
        ? "El último generador de UMBRAL se apaga. Las jaulas están abiertas y los registros dejan de recibir órdenes."
        : state.storyId === "invasion"
          ? "Las alarmas de la ciudad se detienen. Los refugios abren sus puertas y los equipos de rescate vuelven a cruzar las calles."
          : "La grieta se cierra sobre el altar. El cielo recupera su color y los Pokémon dejan de oír la llamada del eclipse.";
    const plan = state.flags.endingResearch
      ? "Las pruebas que conservaste permitirán explicar lo ocurrido sin volver a encender la fuente."
      : state.flags.endingDefiance
        ? "El regulador destruido impide que alguien repita el experimento. Habrá que reconstruir parte de la región."
        : "Los equipos que evacuaste están a salvo. La región empieza a recuperarse con su ayuda.";
    const farewell = hostile
      ? "Hemos terminado, pero sigo sin estar de acuerdo contigo. La próxima vez nos encontraremos como adversarios."
      : state.relationship.romance
        ? "Quiero volver contigo. Esta vez podremos hablar sin contar cuánto falta para el próximo combate."
        : "Me alegra haber llegado hasta aquí contigo. Podemos volver y decidir después cuál será nuestro próximo camino.";
    return scene(
      "Después de la Fractura",
      aftermath,
      plan,
      "El combate terminó. ¿Y nosotros?",
      farewell,
      [
        choose(
          "Regresar a casa",
          "Quiero que volvamos y descansemos.",
          hostile
            ? "Yo tomaré otra ruta. Cuida a tu equipo."
            : "Vamos. Nuestros equipos también merecen una noche tranquila.",
          "La expedición termina. Este final queda registrado permanentemente en tu Diario.",
          "Final guardado",
          s => {
            s.flags.storyWon = true;
          },
          { unlockEnding: true },
        ),
        choose(
          "Proponer otro viaje",
          "Cuando estemos listos, quiero volver a viajar.",
          hostile
            ? "Si nos cruzamos otra vez, tendrás que ganarte el paso."
            : state.relationship.romance
              ? "Sí. Pero la próxima vez también quiero tiempo para estar contigo."
              : "Acepto. Primero descansaremos; después elegiremos juntos la ruta.",
          "El viaje termina con una promesa de volver a encontrarse. El final se conserva entre partidas.",
          "Final guardado · Próximo viaje",
          s => {
            s.flags.storyWon = true;
            s.flags.promisedNextJourney = true;
            if (!hostile) {
              changeRelationship(s, 3, s.relationship.romance ? 3 : 0);
            }
          },
          { unlockEnding: true },
        ),
        choose(
          "Recordar el camino",
          "Quiero conservar lo que aprendimos aquí.",
          "Las decisiones importaron. Anota a quién ayudamos y qué dejamos atrás; no quiero que el viaje se reduzca al último combate.",
          "El Diario conserva el cierre de esta historia y tus decisiones. Puedes empezar otra expedición con un rival y una trama distintos.",
          "Final guardado · Diario",
          s => {
            s.flags.storyWon = true;
          },
          { unlockEnding: true },
        ),
      ],
      state.storyId === "eclipse" ? 7 : 8,
      state.storyId === "eclipse" ? 2 : 3,
    );
  }
  if (wave === 1) {
    const script = {
      umbral: [
        "La radio deja de recibir mensajes. Junto al camino hay cápsulas vacías con el sello de UMBRAL.",
        "Estas cápsulas se usan para transportar Pokémon. UMBRAL tiene un laboratorio al norte, pero nadie responde desde allí.",
        "¿Crees que el corte de radio viene de ese laboratorio?",
        "Es la única señal que sigue activa. Soy "
          + rival.name
          + ". Voy a seguirla. ¿Quieres que compartamos la información?",
      ],
      invasion: [
        "Dos facciones anuncian cierres de caminos por radio: Bastión y Vanguardia. La entrada al pueblo está vacía.",
        "Los refugios se quedaron sin suministros mientras ambas facciones pelean por el paso. Voy a abrir una ruta hasta la ciudad.",
        "¿Con cuál de las dos vas a trabajar?",
        "Con quien permita pasar a los viajeros. Soy "
          + rival.name
          + ". Necesitaré ayuda para revisar los caminos. ¿Vienes conmigo?",
      ],
      eclipse: [
        "El sol se oscurece durante unos segundos. Cuando vuelve la luz, aparecen cristales violetas alrededor de las ruinas.",
        "Los cristales señalan un santuario. La grieta crece cada vez que el cielo vuelve a oscurecerse.",
        "¿Qué vas a buscar dentro del santuario?",
        "El origen de esa energía. Soy "
          + rival.name
          + ". Podemos comparar nuestras lecturas y avanzar juntos. ¿Qué prefieres?",
      ],
    }[state.storyId];
    return scene(
      story.title,
      script[0],
      script[1],
      script[2],
      script[3],
      [
        choose(
          "Compartir la expedición",
          "Sí. Compartamos las pistas y cuidemos de nuestros equipos.",
          "De acuerdo. Llevo un tónico de repuesto; guárdalo para cuando lo necesites.",
          "Acuerdan compartir información. Recibes un Tónico para la Mochila.",
          "+16 confianza · Tónico",
          trust,
          { consumable: "tonic" },
        ),
        choose(
          "Competir de forma justa",
          "Quiero ver quién llega más lejos, pero no voy a sabotearte.",
          "Acepto. Podremos ayudarnos en el camino y competir cuando toque combatir.",
          "Acuerdan una competencia justa. Recibes dos fichas.",
          "+8 rivalidad · 2 fichas",
          s => changeRelationship(s, 3, 0, 8),
          { tokens: 2 },
        ),
        choose(
          "Avanzar por separado",
          "Prefiero seguir sin ti. No te metas en mis decisiones.",
          "Entendido. Seguiré mi propia ruta. Espero que no tengamos que disputarnos el mismo paso.",
          "La relación empieza con desconfianza. Conservas un Sello protector.",
          "+24 rivalidad · Sello",
          oppose,
          { consumable: "shield" },
        ),
      ],
      state.storyId === "eclipse" ? 7 : 4,
      0,
    );
  }
  if (wave === 8) {
    return scene(
      "El paso del puente",
      "Un puente roto corta el camino. Del otro lado, un mensajero pide ayuda. "
        + rival.name
        + " ha dejado un botiquín junto al acceso.",
      hostile
        ? "Podemos usar el paso de la izquierda sin confiar el uno en el otro, pero el mensajero no cruzará solo."
        : "Encontré un paso a la izquierda. Puedo revisar el puente mientras tú ayudas al mensajero.",
      "¿Podemos cruzar antes de que ceda?",
      "Sí, si hacemos una cosa a la vez. También puedes tomar el atajo y continuar.",
      [
        choose(
          "Ayudar al mensajero",
          "Ayudaré al mensajero. Vigila el puente mientras cruzamos.",
          "Voy a sujetar el acceso. Cuando estén a salvo podremos seguir juntos.",
          "El mensajero llega al refugio. Ganas compasión y confianza; recibes un Señuelo.",
          "+2 compasión · Señuelo",
          s => {
            trust(s);
            s.compassion += 2;
          },
          { consumable: "lure" },
        ),
        choose(
          "Tomar el atajo",
          "Cruzaré por el atajo. Necesito avanzar ahora.",
          "Marcaré el camino que tomes. Yo me quedaré hasta que el mensajero cruce.",
          "Encuentras un Voucher Plus en el atajo. La decisión aumenta la rivalidad.",
          "+12 rivalidad · Voucher Plus",
          s => changeRelationship(s, -4, 0, 12),
          { reward: "VOUCHER_PLUS" },
        ),
        choose(
          "Ocultar el paso",
          "Voy a ocultar el paso para que no puedas seguirme.",
          "Eso puede dejar atrapados a otros viajeros. No voy a olvidar lo que hiciste.",
          "Conservas un Prisma del atajo. Con rivalidad 55 o más, los ataques de tu rival causan 15% más daño.",
          "+24 rivalidad · Prisma",
          s => {
            oppose(s);
            s.flags.rivalSabotaged = true;
          },
          { consumable: "prism" },
        ),
      ],
      1,
      1,
    );
  }
  if (wave === 10) {
    const incoming =
      state.storyId === "umbral"
        ? "La radio recibe coordenadas de un traslado de cápsulas hacia el laboratorio."
        : state.storyId === "invasion"
          ? "Un refugio pide ayuda antes de que se cierre el acceso al almacén."
          : "Un símbolo aparece en los cristales y apunta hacia el altar.";
    return scene(
      "Una señal en el camino",
      incoming,
      "La señal nos da una dirección, pero también hay viajeros que necesitan ayuda en este cruce.",
      "¿Tenemos tiempo para revisar ambos caminos?",
      "Podemos registrar la señal o acompañar a los viajeros. Si perseguimos el origen ahora, tendremos que avanzar sin detenernos.",
      [
        choose(
          "Investigar la señal",
          "Copiemos las coordenadas y comparemos la señal.",
          "Guardaré una lectura antes de que cambie la frecuencia.",
          "Ganas tres puntos de investigación y un Voucher Plus.",
          "+3 investigación · Voucher Plus",
          s => {
            s.investigation += 3;
            s.flags.followedSignal = true;
          },
          { reward: "VOUCHER_PLUS" },
        ),
        choose(
          "Proteger a los viajeros",
          "Primero llevemos a los viajeros al refugio.",
          "Iré delante para comprobar que el paso sigue abierto.",
          "Ganas tres puntos de compasión y confianza. El refugio queda protegido y recibes un Tónico.",
          "+3 compasión · Tónico",
          s => {
            trust(s);
            s.compassion += 3;
            s.flags.helpedRefugees = true;
          },
          { consumable: "tonic" },
        ),
        choose(
          "Perseguir el origen",
          "Seguiré la señal antes de que desaparezca.",
          "Marcaré tu ruta para que podamos encontrarnos más adelante.",
          "Ganas tres puntos de desafío y encuentras tres fichas entre los suministros abandonados.",
          "+3 desafío · 3 fichas",
          s => {
            s.defiance += 3;
            s.flags.huntedUmbral = true;
          },
          { tokens: 3 },
        ),
      ],
      state.storyId === "eclipse" ? 7 : 4,
    );
  }
  if (wave === 15) {
    return scene(
      "Una estrategia para el equipo",
      "La expedición encuentra un puesto con instrumentos de entrenamiento y un regulador del clima.",
      "Podemos elegir una especialidad para todo el equipo. No necesitas cambiar tus Pokémon para empezar a aprovecharla.",
      "¿Qué cambia durante los combates?",
      "Una opción mejora los críticos, otra prepara lluvia y la tercera permite recuperar PS al final del turno.",
      [
        choose(
          "Instinto crítico",
          "Quiero aprovechar las oportunidades de un golpe crítico.",
          "Prepararé los ejercicios. Busca movimientos que se beneficien de atacar en el momento justo.",
          "Tus ataques ganan un nivel de probabilidad de crítico durante esta partida.",
          "Críticos: +1 nivel",
          s => {
            s.build = "critical";
          },
        ),
        choose(
          "Control de lluvia",
          "Quiero preparar un equipo que aproveche la lluvia.",
          "Activaré el regulador. La lluvia comenzará en cada combate, salvo cuando una mecánica de jefe cambie el clima.",
          "La lluvia se activa al comenzar los combates. Tu equipo puede aprovechar sus efectos habituales.",
          "Lluvia al iniciar el combate",
          s => {
            s.build = "rain";
          },
        ),
        choose(
          "Reserva vital",
          "Prefiero que el equipo pueda recuperarse entre turnos.",
          "Prepararé las reservas. Funcionarán mientras el Pokémon pueda seguir combatiendo.",
          "Tus Pokémon activos y conscientes recuperan 1/32 de sus PS máximos al final de cada turno.",
          "Curación: 1/32 PS por turno",
          s => {
            s.build = "recovery";
          },
        ),
      ],
      2,
      1,
    );
  }
  if (wave === 20) {
    return scene(
      "Campamento al anochecer",
      "La expedición encuentra un refugio junto a tres caminos. Hay mapas, un botiquín y una fogata encendida.",
      state.flags.helpedRefugees
        ? "Los viajeros que ayudaste trajeron mapas de la zona. Podemos estudiarlos o atender al equipo."
        : "Tenemos un lugar seguro para descansar. Podemos estudiar los caminos o atender al equipo.",
      "¿Qué te trajo a esta expedición?",
      PERSONAL_HISTORY[rival.id],
      [
        choose(
          "Estudiar los mapas",
          "Quiero estudiar los mapas antes de seguir.",
          "Hay un depósito que no figura en la ruta principal. Anotaré cómo reconocerlo.",
          "Recibes el Mapa. Ganas dos puntos de investigación y podrás reconocer el depósito de la oleada 40.",
          "Mapa · Pista para oleada 40",
          s => {
            s.investigation += 2;
            s.flags.campMapped = true;
          },
          { reward: "MAP" },
        ),
        choose(
          "Atender a los heridos",
          "Atendamos al equipo juntos.",
          "Prepararé el botiquín. Tenemos tiempo para recuperar sus fuerzas y sus movimientos.",
          "El equipo recupera PS y PP. Ganas confianza y dos puntos de compasión.",
          "Recuperación completa del equipo",
          s => {
            trust(s);
            s.compassion += 2;
            s.flags.campHelped = true;
          },
          { healParty: true },
        ),
        choose(
          "Conversar junto al fuego",
          "Quiero escuchar tu historia antes de continuar.",
          "Gracias. Te mostraré dónde guardé los suministros para que podamos encontrarlos al volver.",
          "Hablan de su pasado. Ganas 12 de confianza y 15 de afecto; recibes un Sello.",
          "+15 afecto · Sello",
          s => {
            changeRelationship(s, 12, 15, -6);
            s.flags.campPrepared = true;
          },
          { consumable: "shield" },
        ),
      ],
      0,
      0,
    );
  }
  if (wave === 25) {
    return scene(
      "Las reliquias del sendero",
      "Una caja de reliquias conserva tres piezas intactas. Sus sellos responden a los movimientos del equipo.",
      "Cada pieza afecta a todo el equipo. Solo podemos mantener una activa durante esta partida.",
      "¿Qué cambia si la llevo conmigo?",
      "Brasa aumenta el daño de fuego, Marea el de agua y Coraza reduce el daño que recibimos.",
      [
        choose(
          "Brasa",
          "Elegiré Brasa para reforzar los ataques de fuego.",
          "La colocaré en la caja de suministros del equipo.",
          "Los ataques de fuego de tu equipo causan 20% más daño.",
          "Daño de fuego: +20%",
          s => {
            s.relic = "ember";
          },
        ),
        choose(
          "Marea",
          "Elegiré Marea para reforzar los ataques de agua.",
          "Su sello se activa con el agua. Puede combinarse con tu estrategia de lluvia.",
          "Los ataques de agua de tu equipo causan 20% más daño.",
          "Daño de agua: +20%",
          s => {
            s.relic = "tide";
          },
        ),
        choose(
          "Coraza",
          "Prefiero proteger al equipo con Coraza.",
          "La dejaré cerca del equipo. Su protección funciona durante los combates.",
          "Tu equipo recibe 10% menos daño de ataques.",
          "Daño recibido: −10%",
          s => {
            s.relic = "ward";
          },
        ),
      ],
      11,
      1,
    );
  }
  if (wave === 30) {
    const script = {
      umbral: [
        "El laboratorio",
        "Las coordenadas terminan en un laboratorio. Algunas cápsulas siguen encendidas.",
        "Hay Pokémon dentro de las cápsulas y un plano del núcleo en el archivo.",
        "¿Podemos abrir las cápsulas sin alimentar la grieta?",
        "Sí. Podemos recuperar las pruebas, evacuar a los Pokémon o inutilizar el regulador.",
      ],
      invasion: [
        "El almacén ocupado",
        "Una guardia abandonó el almacén de la ciudad. Quedan suministros y registros del faro.",
        "La comida puede sostener a los refugios. Los registros explican por qué los Pokémon se acercan a la ciudad.",
        "¿Podemos llevarlo todo sin quedar atrapados?",
        "Tenemos tiempo para una prioridad. Recuperaremos los registros, evacuaremos a los viajeros o inutilizaremos el regulador.",
      ],
      eclipse: [
        "El altar abierto",
        "El altar tiene tres conductos encendidos. Hay viajeros que no pudieron abandonar las ruinas.",
        "El altar lleva energía hacia una grieta mayor. Su inscripción explica cómo regular los conductos.",
        "¿Podemos sacar a los viajeros antes de cerrarlos?",
        "Sí. Podemos copiar la inscripción, acompañar a los viajeros o destruir el regulador.",
      ],
    }[state.storyId];
    return scene(
      script[0],
      script[1],
      script[2],
      script[3],
      script[4],
      [
        choose(
          "Recuperar las pruebas",
          "Quiero recuperar los registros antes de salir.",
          "Guardaré una copia del plano del núcleo. Nos servirá antes de la próxima batalla.",
          "Ganas tres puntos de investigación y un Voucher Plus. El plano queda registrado.",
          "+3 investigación · Voucher Plus",
          s => {
            s.investigation += 3;
            s.flags.stoleLabData = true;
          },
          { reward: "VOUCHER_PLUS" },
        ),
        choose(
          "Organizar el rescate",
          "Primero saquemos a quienes siguen atrapados.",
          "Abriré la salida y comprobaré que puedan llegar al refugio.",
          "El rescate funciona. Ganas compasión y confianza; recibes un Amuleto Shiny.",
          "+3 compasión · Amuleto Shiny",
          s => {
            trust(s);
            s.compassion += 3;
            s.flags.freedLabPokemon = true;
            s.flags.citySaved = true;
          },
          { reward: "SHINY_CHARM" },
        ),
        choose(
          "Inutilizar el regulador",
          "Voy a desconectar el regulador para que no puedan volver a usarlo.",
          "Sacaré al equipo del radio de la descarga. Tendrás que hacerlo con cuidado.",
          "La instalación queda inutilizada. Ganas desafío y un Amuleto Habilidad.",
          "+3 desafío · Amuleto Habilidad",
          s => {
            s.defiance += 3;
            s.flags.sabotagedUmbralLab = true;
            changeRelationship(s, -4);
          },
          { reward: "ABILITY_CHARM" },
        ),
      ],
      state.storyId === "eclipse" ? 6 : 3,
    );
  }
  if (wave === 40) {
    return scene(
      "Lo que dejamos preparado",
      state.flags.campMapped
        ? "El mapa del campamento conduce hasta un depósito intacto."
        : state.flags.campHelped
          ? "Los viajeros que atendieron regresan con suministros."
          : "Un refugio abre sus reservas para la expedición.",
      state.flags.campPrepared
        ? "Reconozco esta caja. Es la reserva que te mostré junto a la fogata."
        : "Nuestros preparativos nos permiten reponer suministros antes del siguiente tramo.",
      "¿Qué necesitamos antes de continuar?",
      "Podemos reforzar el entrenamiento, recuperar al equipo o preparar protección para el próximo combate.",
      [
        choose(
          "Reforzar el entrenamiento",
          "Quiero que el equipo aproveche mejor la experiencia.",
          "Hay un amuleto entre las reservas del depósito. Llévalo contigo.",
          "Recibes un Amuleto EXP. Los preparativos del campamento quedan registrados.",
          "Amuleto EXP",
          s => {
            s.flags.campPayoff = true;
          },
          { reward: "EXP_CHARM" },
        ),
        choose(
          "Recuperar al equipo",
          "Prefiero recuperar al equipo antes de entrar en el siguiente sector.",
          "Prepararé la zona de descanso y revisaré sus movimientos.",
          "El equipo recupera PS y PP. Ganas dos puntos de compasión.",
          "Recuperación completa",
          s => {
            s.compassion += 2;
            s.flags.campPayoff = true;
          },
          { healParty: true },
        ),
        choose(
          "Preparar la protección",
          "Quiero guardar protección para el siguiente combate.",
          "Tenemos un sello y un tónico de reserva. Úsalos cuando los necesites.",
          "Recibes un Tónico y un Sello protector.",
          "Tónico · Sello",
          s => {
            s.flags.campPayoff = true;
          },
          { consumable: "tonic", extraConsumable: "shield" },
        ),
      ],
      3,
      0,
    );
  }
  if (wave === 49) {
    const machine =
      state.storyId === "umbral"
        ? "el núcleo del laboratorio"
        : state.storyId === "invasion"
          ? "el faro climático"
          : "el regulador del altar";
    return scene(
      "Antes del núcleo",
      "El campo alrededor de " + machine + " cambia de clima. La fuente de energía responde a los conductos.",
      state.flags.stoleLabData
        ? "El plano que recuperaste muestra tres controles. Podemos cambiar el campo antes del combate."
        : "Encontré tres controles del clima. Tenemos que elegir uno antes de entrar.",
      "¿Qué pasa si cerramos el conducto de tormenta?",
      "El campo quedará estable. También podemos preparar lluvia o mantener la tormenta y recoger las reservas del borde.",
      [
        choose(
          "Preparar lluvia",
          "Activemos el conducto de lluvia.",
          "Lo regularé antes de entrar. Tu equipo podrá aprovechar sus efectos habituales.",
          "El combate del núcleo comienza con lluvia. Recibes una Reserva de PP.",
          "Lluvia en oleada 50 · Reserva PP",
          s => {
            s.flags.bossRain = true;
            s.flags.bossStorm = false;
          },
          { consumable: "ether" },
        ),
        choose(
          "Estabilizar el campo",
          "Quiero cerrar el conducto de tormenta.",
          "Mantendré la válvula fija mientras desconectas el flujo.",
          "El plan evita la tormenta inicial del núcleo. Recibes un Sello protector.",
          "Campo estable · Sello",
          s => {
            s.flags.bossUsedPlan = true;
            s.flags.bossRain = false;
            s.flags.bossStorm = false;
          },
          { consumable: "shield" },
        ),
        choose(
          "Mantener la tormenta",
          "Aceptaré la tormenta y recogeré las reservas del borde.",
          "Voy a marcar una salida. No confundas el desafío con una garantía de victoria.",
          "La oleada 50 empieza con tormenta de arena. Recibes un Voucher Plus.",
          "Tormenta de arena · Voucher Plus",
          s => {
            s.flags.bossStorm = true;
            s.flags.bossRain = false;
            s.defiance += 2;
          },
          { reward: "VOUCHER_PLUS" },
        ),
      ],
      5,
    );
  }
  if (wave === 55) {
    const ready = !hostile && state.relationship.trust >= 35 && state.relationship.affection >= 15;
    return scene(
      "Lo que queremos construir",
      rival.name + " te espera junto a una fogata. El equipo descansa y la radio permanece en silencio.",
      hostile
        ? "Hemos tomado decisiones que nos enfrentan. Quiero saber si vamos a seguir tratándonos así."
        : "Me alegra que hayamos llegado hasta aquí. Quiero hablar de nosotros sin que haya una batalla de por medio.",
      "¿Qué te gustaría que cambiara?",
      ready
        ? "Me gustaría seguir a tu lado cuando termine la expedición. Si tú también quieres, podemos intentarlo."
        : "Podemos conocernos mejor o mantener una amistad. No quiero que prometamos algo que todavía no hemos construido.",
      [
        choose(
          ready ? "Proponer una relación" : "Expresar mi interés",
          "Me gustas. Quiero saber si podemos construir algo juntos.",
          ready
            ? "Tú también me gustas. Quiero intentarlo, sin dejar de escucharnos cuando no estemos de acuerdo."
            : "Gracias por decírmelo. Quiero conocerte mejor antes de iniciar una relación. Podemos seguir hablando sin apresurarnos.",
          ready
            ? "Ambos aceptan iniciar una relación. Ganas 25 de afecto y un Voucher Plus."
            : "Expresas tu interés. La relación todavía no comienza; podrán revisarla en la oleada 175. Recibes un Voucher Plus.",
          ready ? "Romance elegido · +25 afecto" : "Interés expresado · Sin romance forzado",
          s => {
            changeRelationship(s, ready ? 20 : 8, ready ? 25 : 10, -10);
            s.flags.romanceInterest = true;
            s.relationship.romance = ready;
            s.flags.rivalRomance = ready;
            s.flags.rivalTruce = true;
          },
          { reward: "VOUCHER_PLUS" },
        ),
        choose(
          "Construir una amistad",
          "Quiero que seamos buenos compañeros. Para mí, esto es una amistad.",
          "Me parece bien. Podemos cuidarnos sin que tenga que convertirse en algo más.",
          "Eligen una amistad. Ganas 20 de confianza y un Tónico.",
          "Amistad · +20 confianza",
          s => {
            changeRelationship(s, 20, 5, -15);
            s.relationship.romance = false;
            s.flags.rivalRomance = false;
            s.flags.romanceInterest = false;
            s.flags.rivalTruce = true;
          },
          { consumable: "tonic" },
        ),
        choose(
          "Seguir como adversarios",
          "Quiero seguir como tu adversario. No voy a prometer una amistad que no siento.",
          "Entonces que quede claro. Competiremos sin fingir cercanía y cada uno responderá por sus decisiones.",
          "La rivalidad aumenta 30 puntos. Recibes dos fichas.",
          "Adversarios · +30 rivalidad",
          s => {
            changeRelationship(s, -20, 0, 30);
            s.relationship.romance = false;
            s.flags.rivalRomance = false;
            s.flags.romanceInterest = false;
            s.flags.rivalEnemy = true;
          },
          { tokens: 2 },
        ),
      ],
      0,
      0,
    );
  }
  if (wave === 60) {
    const opening =
      state.storyId === "umbral"
        ? "El laboratorio alimentaba la grieta, pero no la creó. La señal principal llega desde otra instalación."
        : state.storyId === "invasion"
          ? "El faro atraía a los Pokémon hacia la ciudad. Aunque el paso esté abierto, la energía sigue llegando desde el norte."
          : "El altar era solo un conducto. La grieta recibe energía de un santuario más grande.";
    return scene(
      "La energía que permanece",
      "Un cristal sigue emitiendo pulsos después del combate. La grieta no se ha cerrado.",
      opening,
      "¿Podemos detenerla desde aquí?",
      "Podemos estabilizar esta abertura, acercarnos para observarla o seguir la señal hasta el origen.",
      [
        choose(
          "Estabilizar la abertura",
          "Quiero estabilizarla antes de seguir.",
          "Mantendré el regulador en marcha mientras cierras los conductos pequeños.",
          "La abertura local queda estable. Ganas dos puntos de investigación, dos de compasión y un Voucher Plus.",
          "Zona protegida · Voucher Plus",
          s => {
            s.investigation += 2;
            s.compassion += 2;
            s.flags.stabilizedFracture = true;
          },
          { reward: "VOUCHER_PLUS" },
        ),
        choose(
          "Observar desde el interior",
          "Me acercaré para registrar lo que hay dentro.",
          "Dejaré una cuerda hasta el borde. Vuelve en cuanto cambie la luz del cristal.",
          "Registras el interior y recibes un Amuleto Shiny. Ganas tres puntos de desafío.",
          "+3 desafío · Amuleto Shiny",
          s => {
            s.defiance += 3;
            s.flags.enteredFracture = true;
          },
          { reward: "SHINY_CHARM" },
        ),
        choose(
          "Seguir la señal principal",
          "Marquemos esta zona y sigamos la señal principal.",
          "Guardaré su ubicación. Volveremos con información suficiente para cerrar las aberturas.",
          "Ganas tres puntos de investigación y un Voucher Plus. Registras la dirección de la fuente central.",
          "+3 investigación · Voucher Plus",
          s => {
            s.investigation += 3;
            s.flags.trackedUmbral = true;
          },
          { reward: "VOUCHER_PLUS" },
        ),
      ],
      7,
    );
  }
  if (wave === 75) {
    return scene(
      "El taller del refugio",
      "Los viajeros del refugio intercambian suministros con fichas. Hay un taller, una mesa de Sol o Luna y una ruleta.",
      "Podemos fabricar consumibles con fichas. El taller también prepara remedios y reservas de PP.",
      "¿Tengo que apostar para conseguirlos?",
      "No. Las fichas de los eventos sirven directamente en el taller. La ruleta usa un Voucher por giro.",
      [
        choose(
          "Guardar fichas para el taller",
          "Quiero fabricar lo que necesite.",
          "El precio de cada receta aparece antes de fabricarla.",
          "Recibes cuatro fichas para usar en el Taller del Refugio Fractura.",
          "4 fichas · Taller",
          s => {
            s.flags.casinoVisited = true;
          },
          { tokens: 4 },
        ),
        choose(
          "Preparar un botiquín",
          "Prefiero llevar remedios antes de arriesgar recursos.",
          "Guardaré un remedio y otra reserva de PP para ti.",
          "Recibes un Remedio de expedición y una Reserva de PP.",
          "Remedio · Reserva PP",
          s => {
            s.flags.casinoSupplies = true;
          },
          { consumable: "remedy", extraConsumable: "ether" },
        ),
        choose(
          "Probar la ruleta",
          "Probaré un giro de la ruleta.",
          "Revisa los premios antes de girar. Cada sección tiene la misma probabilidad.",
          "Recibes un Voucher normal para la ruleta o la gacha de huevos.",
          "1 Voucher normal",
          s => {
            s.flags.casinoVisited = true;
          },
          { reward: "VOUCHER" },
        ),
      ],
      12,
      3,
    );
  }
  if (wave === 95 || wave === 145) {
    const destination =
      state.storyId === "umbral"
        ? "la instalación central"
        : state.storyId === "invasion"
          ? "el corredor de evacuación"
          : "el santuario central";
    return scene(
      wave === 95 ? "Volver a comparar los caminos" : "La entrada del último sector",
      rival.name
        + " despliega sus mapas de "
        + destination
        + ". "
        + (state.flags.citySaved
          ? "Los viajeros que rescataste ofrecen ayuda."
          : "Algunas rutas siguen sin vigilancia."),
      hostile
        ? "No hemos recuperado la confianza. Aun así, este mapa sirve a los dos. Quiero acordar qué parte revisará cada uno."
        : "Podemos cubrirnos en los cruces o avanzar por separado y comparar las lecturas.",
      "¿Qué sabemos del acceso principal?",
      "La energía se concentra allí. Necesitamos información y una salida por si el campo cambia durante el combate.",
      [
        choose(
          "Coordinar nuestras rutas",
          "Compartamos los mapas y acordemos una salida.",
          "Marcaré un punto de encuentro en cada cruce.",
          "Ganas confianza y dos puntos de investigación. Recibes un Amuleto Habilidad.",
          "+16 confianza · Amuleto Habilidad",
          s => {
            trust(s);
            s.investigation += 2;
            s.flags.rivalTrusted = true;
          },
          { reward: "ABILITY_CHARM" },
        ),
        choose(
          "Revisar una ruta por mi cuenta",
          "Revisaré otra ruta y compartiré lo que encuentre.",
          "Una ruta distinta nos dará una lectura independiente.",
          "Ganas dos puntos de investigación y un Voucher Plus.",
          "+2 investigación · Voucher Plus",
          s => {
            s.investigation += 2;
            s.flags.rivalIndependent = true;
          },
          { reward: "VOUCHER_PLUS" },
        ),
        choose(
          "Disputar el acceso",
          "Voy a tomar el acceso principal antes que tú.",
          "No pienso cederlo sin comprobar el campo. En el próximo combate veremos quién está mejor preparado.",
          "La rivalidad aumenta. Guardas un Sello para la siguiente batalla.",
          "+24 rivalidad · Sello",
          oppose,
          { consumable: "shield" },
        ),
      ],
      10,
      1,
    );
  }
  if (wave === 175) {
    const ready = !hostile && state.relationship.trust >= 35 && state.relationship.affection >= 20;
    const questReady = state.companionQuest === "active" && personalMissionReady(state);
    const romance = ready && !!state.flags.romanceInterest;
    return scene(
      "Antes de la despedida",
      "La expedición llega al último refugio. "
        + rival.name
        + " tiene una carta preparada para cuando termine el viaje.",
      hostile
        ? "No quiero acabar el viaje repitiendo las mismas discusiones. Podemos acordar un límite aunque sigamos siendo adversarios."
        : state.relationship.romance
          ? "Quiero volver contigo cuando termine esto. Podemos decidir cómo seguir sin prometer que todo será fácil."
          : state.flags.romanceInterest
            ? "Recuerdo lo que me dijiste junto a la fogata. Quiero volver a hablar de ello."
            : "Cuando regresemos, me gustaría que no perdiéramos el contacto.",
      "¿Qué quieres hacer cuando salgamos de aquí?",
      romance
        ? "Quiero intentar una relación contigo, si todavía lo deseas."
        : "Podemos mantener el vínculo, cerrar las tareas pendientes o seguir cada uno su camino.",
      [
        choose(
          romance ? "Elegir una relación juntos" : "Conservar nuestro vínculo",
          romance
            ? "Sigo queriendo una relación contigo. Me gustaría intentarlo juntos."
            : "Quiero que sigamos en contacto cuando esto termine.",
          romance
            ? "Yo también. Empecemos por volver a salvo y elegir juntos lo que viene."
            : "Me gustaría. Te dejaré una dirección en la carta para que podamos encontrarnos.",
          (questReady ? "Compartes las pruebas de su misión y desbloqueas el permiso permanente de taller. " : "")
            + "Conservan el vínculo y recibes un Tónico.",
          questReady ? "Misión completada · Vínculo elegido" : "Vínculo elegido · Tónico",
          s => {
            changeRelationship(s, 16, 10, -10);
            if (romance) {
              s.relationship.romance = true;
              s.flags.rivalRomance = true;
            }
            s.flags.rivalPromise = true;
            if (questReady) {
              s.companionQuest = "resolved";
            }
          },
          { consumable: "tonic", unlockWorkshop: questReady },
        ),
        choose(
          "Acordar una tregua",
          "Quiero terminar esta expedición sin volver a sabotearnos.",
          "Acepto. Una tregua no borra lo ocurrido, pero nos permite actuar de otra manera.",
          "La rivalidad baja 20 puntos. Recibes una Reserva de PP.",
          "Tregua · Rivalidad −20",
          s => {
            changeRelationship(s, 10, 0, -20);
            s.flags.rivalTruce = true;
          },
          { consumable: "ether" },
        ),
        choose(
          "Cerrar nuestro camino juntos",
          "Prefiero cerrar aquí nuestra relación y seguir por mi cuenta.",
          "Gracias por decirlo con claridad. Te deseo un regreso seguro.",
          "Deciden seguir por separado. La relación romántica termina si estaba activa. Conservas dos fichas.",
          "Separación elegida · 2 fichas",
          s => {
            s.relationship.romance = false;
            s.flags.rivalRomance = false;
            s.flags.romanceInterest = false;
            s.flags.rivalIndependent = true;
          },
          { tokens: 2 },
        ),
      ],
      9,
      0,
    );
  }
  if (wave === 195) {
    const source =
      state.storyId === "umbral"
        ? "el núcleo de la instalación"
        : state.storyId === "invasion"
          ? "el faro que bloquea la evacuación"
          : "la grieta del santuario";
    return scene(
      "El plan de cierre",
      "La energía de " + source + " ilumina el último campo. Su Pokémon protector sigue entre ustedes y la salida.",
      "Necesitamos elegir un plan para después del combate. Las lecturas del viaje nos dan tres opciones.",
      "¿Qué podemos conservar sin dejar la zona en peligro?",
      "Podemos cerrar el flujo, guardar una copia de las lecturas o destruir el regulador.",
      [
        choose(
          "Cerrar el flujo y evacuar",
          "Quiero cerrar el flujo y sacar a todos de la zona.",
          "Prepararé la salida. En cuanto caiga la fuente de energía, cerraremos los conductos.",
          "El plan prioriza el rescate y el cierre de la grieta. Recibes un Tónico y un Sello para el último tramo.",
          "Plan: rescate · 2 consumibles",
          s => {
            s.flags.endingRescue = true;
            s.flags.endingResearch = false;
            s.flags.endingDefiance = false;
          },
          { consumable: "tonic", extraConsumable: "shield" },
        ),
        choose(
          "Conservar una copia del registro",
          "Quiero cerrar la zona y conservar las lecturas.",
          "Guardaré solo los registros. No volveremos a encender un mecanismo que no podamos controlar.",
          "El plan conserva las pruebas sin mantener el flujo activo. Recibes un Prisma y un Voucher Plus.",
          "Plan: pruebas · Prisma",
          s => {
            s.flags.endingResearch = true;
            s.flags.endingRescue = false;
            s.flags.endingDefiance = false;
          },
          { consumable: "prism", reward: "VOUCHER_PLUS" },
        ),
        choose(
          "Destruir el regulador",
          "Voy a destruir el regulador para impedir que vuelvan a usarlo.",
          "Sacaré al equipo del radio de la descarga. Tendrás que derrotar primero al Pokémon que protege la fuente.",
          "El plan deja inutilizada la instalación. Recibes dos Sellos protectores.",
          "Plan: destrucción · 2 Sellos",
          s => {
            s.flags.endingDefiance = true;
            s.flags.endingRescue = false;
            s.flags.endingResearch = false;
          },
          { consumable: "shield", extraConsumable: "shield" },
        ),
      ],
      state.storyId === "eclipse" ? 7 : 5,
      2,
    );
  }
  return undefined;
}
