import { FRACTURA_EVENT_WAVES } from "./chapters";
import { PERSONAL_HISTORY } from "./quests";
import { changeRelationship, type FracturaRunState, getRival, seedHash } from "./run-state";
import type { FracturaStoryChoice, FracturaStoryEvent } from "./story";
export interface AmbientContext {
  seed: string;
  wave: number;
  biome: number;
  hurt: boolean;
  mysteryEncounter?: boolean | undefined;
}
export function ambientEncounter(context: AmbientContext, state: FracturaRunState): FracturaStoryEvent | undefined {
  const { wave, biome, hurt, seed } = context;
  if (
    wave < 12
    || wave > 194
    || context.mysteryEncounter
    || FRACTURA_EVENT_WAVES.includes(wave)
    || wave - state.lastAmbientWave < 7
  ) {
    return;
  }
  const route = state.route?.nextWave === wave;
  if (!hurt && !route && seedHash(seed + ":" + wave + ":ambient") % 9 >= 2) {
    return;
  }
  const kind = hurt
    ? "aid"
    : route
      ? "route"
      : [17, 21, 41].includes(biome)
        ? "signal"
        : [19, 22, 24, 29].includes(biome)
          ? "echo"
          : "talk";
  const id = "ambient-" + wave + "-" + kind;
  if (state.completedEvents.includes(id)) {
    return;
  }
  const rival = getRival(state);
  const option = (
    label: string,
    spoken: string,
    reply: string,
    resultText: string,
    hint: string,
    apply: FracturaStoryChoice["apply"],
    extra: Partial<FracturaStoryChoice> = {},
  ): FracturaStoryChoice => ({ label, spoken, reply, resultText, hint, apply, ...extra });
  let title: string;
  let intro: string;
  let line: string;
  let question: string;
  let prop: number;
  let choices: FracturaStoryChoice[];
  if (kind === "aid") {
    title = "Una pausa necesaria";
    prop = 1;
    intro = rival.name + " deja un botiquín junto al equipo herido. El camino permite detenerse unos minutos.";
    line = "Tu equipo está herido. Puedo atenderlo aquí o dejarte un remedio para más adelante.";
    question = "¿Prefieres descansar o llevar el remedio?";
    choices = [
      option(
        "Atender al equipo",
        "Quiero atender al equipo antes de seguir.",
        "Prepararé el botiquín. Unos minutos de descanso pueden evitar que la siguiente batalla salga mal.",
        "Los Pokémon conscientes recuperan 20% de sus PS máximos. Ganas confianza.",
        "+20% PS · +6 confianza",
        s => changeRelationship(s, 6, 1, -2),
        { healFraction: 0.2 },
      ),
      option(
        "Guardar un remedio",
        "Llevaré el remedio para cuando lo necesite.",
        "Bien. Guárdalo en la mochila; servirá si tu equipo sufre un problema de estado.",
        "Recibes un Remedio de expedición.",
        "Remedio para la mochila",
        () => {},
        { consumable: "remedy" },
      ),
      option(
        "Continuar ahora",
        "Quiero continuar. Me encargaré del equipo en el próximo descanso.",
        "De acuerdo. Conservaré el botiquín por si volvemos a necesitarlo.",
        "Retomas el camino y conservas una ficha de la expedición.",
        "1 ficha",
        () => {},
        { tokens: 1 },
      ),
    ];
  } else if (kind === "route") {
    title = "Las señales del nuevo camino";
    prop = 10;
    intro = "Al entrar en la nueva ruta, " + rival.name + " encuentra marcas que no aparecen en el mapa.";
    line = "Estas marcas parecen recientes. Podemos estudiarlas o comprobar si hay viajeros que necesiten ayuda.";
    question = "¿Qué quieres revisar primero?";
    choices = [
      option(
        "Examinar las marcas",
        "Voy a comparar las marcas con el mapa.",
        "Anotaré su posición. Así podremos reconocerlas en el siguiente cruce.",
        "Ganas dos puntos de investigación y una ficha.",
        "+2 investigación · 1 ficha",
        s => {
          s.investigation += 2;
        },
        { tokens: 1 },
      ),
      option(
        "Buscar a los viajeros",
        "Prefiero comprobar si los viajeros están bien.",
        "Te acompañaré hasta el refugio más cercano.",
        "Ganas dos puntos de compasión y el equipo consciente recupera 15% de PS.",
        "+2 compasión · +15% PS",
        s => {
          s.compassion += 2;
        },
        { healFraction: 0.15 },
      ),
      option(
        "Preparar el equipo",
        "Antes de explorar, quiero proteger al equipo.",
        "Tengo un sello de repuesto. Úsalo cuando decidas entrar en combate.",
        "Recibes un Sello protector.",
        "Sello protector",
        () => {},
        { consumable: "shield" },
      ),
    ];
  } else if (kind === "signal") {
    title = "Una radio que todavía responde";
    prop = 4;
    intro = "Una radio entre los escombros repite una señal. " + rival.name + " consigue ajustar su frecuencia.";
    line = "La señal incluye coordenadas. Puedo copiarlas o intentar pedir suministros al refugio que responde.";
    question = "¿Qué mensaje quieres enviar?";
    choices = [
      option(
        "Copiar las coordenadas",
        "Quiero conservar esas coordenadas.",
        "Las compararé con nuestras lecturas. Si coinciden, tendremos una pista más.",
        "Ganas dos puntos de investigación.",
        "+2 investigación",
        s => {
          s.investigation += 2;
        },
      ),
      option(
        "Pedir una reserva de PP",
        "Pidamos una reserva para el equipo.",
        "El refugio tiene una caja de suministros cerca del camino. Nos indican cómo llegar.",
        "Recibes una Reserva de PP.",
        "Reserva PP",
        () => {},
        { consumable: "ether" },
      ),
      option(
        "Marcar la ubicación",
        "Marquemos la radio para otros viajeros y sigamos.",
        "Dejaré una señal visible junto al acceso.",
        "Ganas un punto de compasión y una ficha.",
        "+1 compasión · 1 ficha",
        s => {
          s.compassion++;
        },
        { tokens: 1 },
      ),
    ];
  } else if (kind === "echo") {
    title = "El altar encendido";
    prop = 6;
    intro = "Un pequeño altar sigue emitiendo luz después del combate. Nadie parece vigilarlo.";
    line =
      "La energía de este altar cambia cuando nos acercamos. Podemos estudiarla, sellarla o recoger uno de los cristales del borde.";
    question = "¿Qué harás con el altar?";
    choices = [
      option(
        "Estudiar el cambio",
        "Quiero medir la energía antes de tocar el altar.",
        "Compararé la lectura con el registro anterior.",
        "Ganas un punto de investigación y un Prisma.",
        "+1 investigación · Prisma",
        s => {
          s.investigation++;
        },
        { consumable: "prism" },
      ),
      option(
        "Sellar el acceso",
        "Prefiero sellarlo para que nadie se acerque por accidente.",
        "Marcaré el peligro y te ayudaré con el sello.",
        "Ganas un punto de compasión y conservas un Sello protector.",
        "+1 compasión · Sello",
        s => {
          s.compassion++;
        },
        { consumable: "shield" },
      ),
      option(
        "Recoger un cristal",
        "Recogeré solo uno de los cristales del borde.",
        "Ese cristal ya está desprendido. No hace falta tocar el centro.",
        "El cristal se convierte en un Señuelo para la mochila.",
        "Señuelo shiny",
        () => {},
        { consumable: "lure" },
      ),
    ];
  } else {
    title = "Un momento para conversar";
    prop = 13;
    intro = rival.name + " prepara dos vasos junto al camino. El equipo descansa mientras pasa una ráfaga de viento.";
    line =
      state.relationship.rivalry >= 55
        ? "Podemos hablar sin fingir una amistad. ¿Quieres preguntarme algo o prefieres preparar el siguiente combate?"
        : "Tenemos unos minutos tranquilos. Podemos hablar de mi búsqueda o revisar cómo está el equipo.";
    question = "¿De qué quieres hablar?";
    choices = [
      option(
        "Preguntar por su búsqueda",
        "¿Por qué es tan importante para ti esta búsqueda?",
        PERSONAL_HISTORY[rival.id],
        "Conoces mejor la historia de tu rival. Ganas confianza; el afecto crece si ya hay una alianza.",
        "+5 confianza",
        s => changeRelationship(s, 5, s.relationship.trust >= 35 ? 2 : 0, -2),
      ),
      option(
        "Revisar la estrategia",
        "Quiero revisar cómo estamos usando los movimientos.",
        "Algunos movimientos necesitan una reserva de PP. Tengo una que puedes llevar.",
        "Recibes una Reserva de PP.",
        "Reserva PP",
        () => {},
        { consumable: "ether" },
      ),
      option(
        "Descansar en silencio",
        "Prefiero descansar sin hablar por ahora.",
        "De acuerdo. Me quedaré aquí hasta que el equipo esté listo.",
        "Descansan sin cambiar el vínculo. Conservas una ficha.",
        "1 ficha",
        () => {},
        { tokens: 1 },
      ),
    ];
  }
  return {
    id,
    afterWave: wave,
    title,
    intro,
    choices,
    question,
    sceneProp: prop,
    ambient: true,
    speaker: rival.name,
    portrait: rival.frame,
    dialogue: [
      { speaker: "narrator", text: intro, pose: 0 },
      { speaker: "rival", text: line, pose: state.relationship.rivalry >= 55 ? 2 : 1 },
      { speaker: "rival", text: question, pose: 1 },
    ],
  };
}
