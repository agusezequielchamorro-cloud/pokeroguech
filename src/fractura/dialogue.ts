import type { FracturaRunState, RivalId } from "./run-state";
import { getRival } from "./run-state";
import type { FracturaStoryEvent } from "./story";
export interface FracturaDialogueLine {
  speaker: "rival" | "player" | "narrator";
  text: string;
  pose?: 0 | 1 | 2 | 3;
  effect?: "signal" | "glow" | "shake" | undefined;
}
export function splitSceneText(text: string, limit = 180, fits?: (candidate: string) => boolean): string[] {
  const normalized = text.replaceAll("$", " ").trim().replace(/\s+/g, " ");
  const accepts = (s: string) => (fits ? fits(s) : s.length <= limit);
  const sentences = normalized.match(/[^.!?]+[.!?]+(?:[»”"])?|[^.!?]+$/gu) ?? [normalized];
  const pages: string[] = [];
  let page = "";
  const flush = () => {
    if (page) {
      pages.push(page);
      page = "";
    }
  };
  for (const fragment of sentences) {
    const sentence = fragment.trim();
    if (!sentence) {
      continue;
    }
    const joined = page ? page + " " + sentence : sentence;
    if (accepts(joined)) {
      page = joined;
    } else if (accepts(sentence)) {
      flush();
      page = sentence;
    } else {
      flush();
      for (const word of sentence.split(/\s+/)) {
        const next = page ? page + " " + word : word;
        if (page && !accepts(next)) {
          flush();
        }
        page += (page ? " " : "") + word;
      }
    }
  }
  flush();
  return pages.length > 0 ? pages : [""];
}
const VOICES: Record<RivalId, { compete: string; win: string; lose: string; hostile: string }> = {
  elian: {
    compete:
      "Vamos a comprobar cómo se adapta nuestro equipo a este campo. No te guardaré el mejor movimiento para después.",
    win: "Me ganaste. La próxima vez tendré que elegir mejor cuándo cambiar de Pokémon.",
    lose: "Esta vez llegué primero. Tu equipo necesita descansar; el camino puede esperar.",
    hostile: "Puedes intentar adelantarte a mí. En este campo tendrás que ganar el paso combatiendo.",
  },
  vera: {
    compete: "He cambiado el orden de mi equipo. Quiero ver si logras encontrar la oportunidad antes que yo.",
    win: "Encontraste el momento justo para atacar. Te concedo esta victoria.",
    lose: "La oportunidad fue mía esta vez. No sigas con el equipo herido solo por demostrarme algo.",
    hostile: "No voy a confiarte mis planes. Tendrás que descubrirlos durante el combate.",
  },
  nadir: {
    compete: "Quiero comparar nuestros equipos en las mismas condiciones. Después podremos revisar qué funcionó.",
    win: "Tu estrategia funcionó mejor. Voy a revisar el turno en el que perdí el control del combate.",
    lose: "El combate terminó. Anotaremos las diferencias cuando tu equipo se haya recuperado.",
    hostile: "Aquí solo voy a confiar en lo que vea hacer a tu equipo. No voy a pedirte que compartas tus planes.",
  },
  alma: {
    compete:
      "He preparado al equipo para aguantar un combate largo. No hace falta pelear con descuido para dar lo mejor.",
    win: "Tu equipo se coordinó mejor. Es una victoria justa.",
    lose: "He ganado, pero eso no cambia que tu equipo necesite atención. Descansemos antes de seguir.",
    hostile: "No estoy de acuerdo con tus decisiones. Voy a combatir en serio y a cuidar de mi equipo.",
  },
};
export function conversationFor(event: FracturaStoryEvent, _state: FracturaRunState): FracturaDialogueLine[] {
  return event.dialogue
    ? [...event.dialogue]
    : [
        { speaker: "narrator", text: event.intro, pose: 0 },
        { speaker: "rival", text: "Tenemos varias opciones. ¿Cómo quieres continuar?", pose: 1 },
      ];
}
export function responseFor(
  event: FracturaStoryEvent,
  index: number,
  state: FracturaRunState,
  result: string,
  previous?: FracturaRunState,
): FracturaDialogueLine[] {
  const choice = event.choices[index];
  const upset = !!previous && state.relationship.trust < previous.relationship.trust;
  return [
    { speaker: "player", text: choice.spoken ?? "He elegido: " + choice.label.toLowerCase() + ".", pose: 0 },
    {
      speaker: "rival",
      text: choice.reply ?? (upset ? "No estoy de acuerdo. Seguiremos por separado." : "De acuerdo. Sigamos ese plan."),
      pose: upset ? 2 : 1,
      effect: state.relationship.romance && !previous?.relationship.romance ? "glow" : undefined,
    },
    { speaker: "narrator", text: result, pose: 0 },
  ];
}
export function battleRivalLossWords(state: FracturaRunState): string {
  return state.relationship.rivalry >= 55
    ? "He ganado este combate. No voy a fingir que eso resuelve lo que pasó entre nosotros.$Podremos volver a competir cuando hayas preparado al equipo."
    : VOICES[state.rivalId].lose + "$Nos encontraremos en el siguiente refugio.";
}
export function battleRivalWords(state: FracturaRunState, wave: number, victory = false): string {
  const voice = VOICES[state.rivalId];
  if (victory) {
    return (
      voice.win
      + "$"
      + (state.relationship.rivalry >= 55
        ? "Seguimos siendo adversarios. Nos veremos en el próximo campo."
        : state.relationship.romance
          ? "Me alegra verte bien. Hablaremos después de atender al equipo."
          : "Cuando terminemos de atender al equipo, podremos seguir el camino.")
    );
  }
  if (state.relationship.rivalry >= 55) {
    return voice.hostile + "$Elige tus movimientos. El combate empieza aquí.";
  }
  return (
    (wave < 20 ? getRival(state).greeting : voice.compete)
    + "$"
    + (state.relationship.romance
      ? "Me alegra volver a verte. Aun así, voy a dar lo mejor en este combate."
      : "Quiero ver qué ha aprendido tu equipo desde la última vez.")
  );
}
