import { FRACTURA_EVENT_WAVES } from "./chapters";
import type { FracturaRunState } from "./run-state";
import { changeRelationship, getRival, seedHash } from "./run-state";
import type { FracturaStoryEvent } from "./story";

export interface EncounterContext {
  seed: string;
  wave: number;
  biome: number;
  hurt: boolean;
  mysteryEncounter?: boolean;
}

/** Seeded, context-sensitive vignettes use no combat RNG and leave four waves between appearances. */
export function ambientEncounter(context: EncounterContext, state: FracturaRunState): FracturaStoryEvent | undefined {
  const { wave, biome, seed } = context;
  if (
    wave < 3
    || wave > 194
    || context.mysteryEncounter
    || FRACTURA_EVENT_WAVES.includes(wave)
    || wave - state.lastAmbientWave < 4
    || state.completedEvents.some(id => id.startsWith(`ambient-${wave}-`))
  ) {
    return undefined;
  }
  const roll = seedHash(`${seed}:${wave}:ambient`);
  // Injuries or a newly chosen route provide an immediate reason to approach; otherwise use a seeded appearance.
  const routeArrival = state.route?.nextWave === wave;
  if (!context.hurt && !routeArrival && roll % 7 > 1) {
    return undefined;
  }
  const kind = context.hurt
    ? "aid"
    : routeArrival
      ? "route"
      : [17, 21, 41].includes(biome)
        ? "signal"
        : [19, 22, 24, 29].includes(biome)
          ? "echo"
          : "talk";
  const rival = getRival(state);
  const hostile = state.relationship.rivalry >= 55;
  const scene: FracturaStoryEvent = {
    id: `ambient-${wave}-${kind}`,
    afterWave: wave,
    title: {
      aid: "Una pausa necesaria",
      route: "Pasos compartidos",
      signal: "La terminal encendida",
      echo: "Lo que calla la piedra",
      talk: "Mientras seguimos el camino",
    }[kind],
    intro: `${rival.name} te alcanza en el camino.`,
    speaker: rival.name,
    portrait: rival.frame,
    ambient: true,
    dialogue: [
      {
        speaker: "narrator",
        text:
          kind === "aid"
            ? "El último combate dejó al equipo herido. Unos pasos se acercan mientras revisás las mochilas."
            : kind === "route"
              ? "El sendero que elegiste desemboca en un nuevo territorio. Tu rival frena para mirar alrededor."
              : "Mientras avanzás, tu rival reduce el paso hasta caminar a tu lado.",
        pose: 0,
      },
      {
        speaker: "rival",
        text: hostile
          ? "No voy a fingir que somos amigos. Pero tampoco pienso dejar que esta expedición nos destruya. ¿Podemos hablar?"
          : kind === "aid"
            ? "Vi cómo terminó la pelea. Tu equipo necesita aire. Puedo ayudarte a tratar algunas heridas, si me dejás."
            : kind === "signal"
              ? "La terminal sigue recibiendo energía. Si copiamos la señal vamos a dejar un rastro. ¿Querés arriesgarte?"
              : kind === "echo"
                ? "Hay marcas que no estaban en el mapa. No sé si son una advertencia o una invitación. ¿Qué te dicen a vos?"
                : rival.id === "elian"
                  ? "Siempre miro qué hay detrás de la próxima curva. Hoy me descubrí mirando si seguías a mi lado."
                  : rival.id === "vera"
                    ? "¿Te puedo preguntar algo? Cuando esto termine, ¿vas a recordar la recompensa o con quién llegaste hasta ella?"
                    : rival.id === "nadir"
                      ? "Anoté cada anomalía de este camino. La parte que no sé explicar es por qué me tranquiliza escucharte cerca."
                      : "No hace falta estar al borde de caer para pedir ayuda. Me gustaría que también pudieras decírmelo cuando estás bien.",
        pose: hostile ? 2 : 1,
      },
    ],
    choices: [
      {
        label:
          kind === "aid"
            ? "Tratar al equipo juntos"
            : kind === "signal"
              ? "Copiar la señal juntos"
              : "Contarle lo que siento",
        hint: kind === "aid" ? "+20% PS a conscientes · +8 confianza" : "+8 confianza · +6 afecto",
        healFraction: kind === "aid" ? 0.2 : undefined,
        resultText:
          kind === "aid"
            ? "Recuperás un 20% de los PS máximos de los Pokémon conscientes. La expedición continúa."
            : "La conversación queda en su memoria. El vínculo cambia sin interrumpir el recorrido.",
        reply:
          kind === "aid"
            ? "Sostené estas vendas. Eso es. La próxima vez avisame antes de que tengas que aguantar todo por tu cuenta."
            : "Gracias por decírmelo. Voy a acordarme de este momento, aunque el camino se ponga difícil.",
        apply: s => {
          changeRelationship(s, 8, kind === "aid" ? 1 : 6, -3);
          s.investigation += kind === "signal" || kind === "echo" ? 1 : 0;
        },
      },
      {
        label: "Proponer un desafío amistoso",
        hint: "+5 rivalidad · 1 ficha",
        tokens: 1,
        resultText: "Acuerdan un desafío para el camino. Guardás una ficha de casino.",
        reply: "Acepto. Que compitamos no significa que no podamos disfrutar del viaje juntos.",
        apply: s => changeRelationship(s, 2, 0, 5),
      },
      {
        label: "Pedir espacio y seguir",
        hint: "Seguís sin gastar recursos",
        resultText: "Tu rival respeta tu decisión y camina unos pasos más atrás.",
        reply: "Está bien. No voy a obligarte a hablar. Si cambiás de idea, sabés dónde encontrarme.",
        apply: s => changeRelationship(s, 0, 0, 1),
      },
    ],
  };
  return scene;
}
