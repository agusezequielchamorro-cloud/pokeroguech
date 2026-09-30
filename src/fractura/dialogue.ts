import type { FracturaRunState, RivalId } from "./run-state";
import { getRival, relationshipLabel } from "./run-state";
import type { FracturaStoryEvent } from "./story";

export interface FracturaDialogueLine {
  speaker: "rival" | "player" | "narrator";
  text: string;
  pose?: 0 | 1 | 2 | 3;
  effect?: "signal" | "glow" | "shake" | undefined;
}

/** Explicit short pages fit the compact dialogue box without losing any words. */
export function splitSceneText(text: string, limit = 98): string[] {
  const pages: string[] = [];
  let page = "";
  for (const word of text.replaceAll("$", " ").split(/\s+/)) {
    if (page && page.length + word.length + 1 > limit) {
      pages.push(page);
      page = word;
    } else {
      page += `${page ? " " : ""}${word}`;
    }
  }
  if (page) {
    pages.push(page);
  }
  return pages.length > 0 ? pages : [""];
}

const VOICES: Record<RivalId, { question: string; agree: string; compete: string; hurt: string; personal: string }> = {
  elian: {
    question: "Antes de correr hacia el próximo problema, quiero saber qué pensás vos.",
    agree: "Sabía que podía contar con vos. Voy delante; avisame si necesitás parar.",
    compete: "Un desafío, entonces. Me gusta. Pero llegar primero no vale si alguien queda atrás.",
    hurt: "Puedo aceptar que me ganes. Que uses mi confianza en mi contra es otra cosa.",
    personal: "Siempre fui bueno encontrando caminos. Todavía estoy aprendiendo a quedarme con alguien.",
  },
  vera: {
    question: "Yo puedo abrir la puerta. Lo que encontremos detrás... eso lo decidimos entre los dos.",
    agree: "Bien. No suelo compartir mis hallazgos, pero con vos voy a hacer una excepción.",
    compete: "Trato hecho. No esperes que afloje; me gusta cuando me obligás a pensar.",
    hurt: "Una advertencia: no confundas que me importe lo que hagas con que vaya a tolerar cualquier cosa.",
    personal: "No me fui por las reliquias. Me fui porque en casa ya habían decidido quién tenía que ser.",
  },
  nadir: {
    question: "Los datos pueden decirme qué es posible. No pueden decirme qué deberíamos hacer. Te escucho.",
    agree: "Voy a registrar nuestro plan. Y esta vez, también voy a confiar en algo que no puedo medir.",
    compete: "Acepto. Si me ganás, voy a querer saber cómo lo hiciste. Sin excusas.",
    hurt: "Entendí tu decisión. No significa que deje de dolerme. A partir de ahora voy a ser más cuidadoso.",
    personal: "Antes investigaba para tener todas las respuestas. Ahora quiero que nadie pague por las que me faltan.",
  },
  alma: {
    question: "Puedo preparar vendas, pero no decidir por vos. Decime cómo querés seguir.",
    agree: "Gracias. Me tranquiliza saber que no tengo que cuidar de todos a solas.",
    compete: "Voy a esforzarme de verdad. Competir con vos no cambia que quiera verte llegar bien.",
    hurt: "No te voy a perseguir para convencerte. Pero tampoco voy a fingir que esto no me importa.",
    personal: "Sé cuidar a los demás. Pedir que alguien se quede conmigo... eso me cuesta mucho más.",
  },
};

const CHAPTER_WORDS: Record<number, string> = {
  1: "La señal cortó nuestras comunicaciones. No voy a seguirte por obligación. Quiero saber si podemos confiar.",
  8: "Escuchá. Hay alguien del otro lado del puente, y está herido. No pienso pasar como si no lo hubiera visto.",
  10: "Encontré un rastro mientras peleabas. Todavía podemos seguirlo, pero la gente que huye necesita ayuda ahora.",
  15: "Te estuve observando pelear. ¿Querés buscar golpes críticos, dominar la lluvia o resistir hasta el final?",
  20: "Apaguemos los equipos un rato. Traje agua y un lugar junto al fuego. ¿Cómo estás llevando todo esto?",
  25: "Estas reliquias afectan a todo el equipo. Elegí con calma. Yo voy a vigilar mientras las revisás.",
  30: "La puerta sigue abierta. Hay criaturas adentro. Si entramos, quiero que tengamos claro qué vamos a arriesgar.",
  40: "Lo que hiciste en el refugio no pasó desapercibido. Lo escuché en el camino. Ahora tenemos otra oportunidad.",
  49: "El dispositivo ya está cargando. Tengo tus notas. Si cambiamos su clima, tenemos que decidirlo antes de entrar.",
  55: "Me quedé pensando en lo que hablamos. Cuando termine esta expedición, ¿querés que nos sigamos viendo?",
  60: "Sobrevivimos al dispositivo, pero no todo quedó atrás. Quiero saber cómo vamos a usar lo que encontramos.",
  75: "El casino parece seguro. Podemos guardar las fichas o probar suerte. Yo quiero que decidamos cuánto arriesgar.",
  95: "Cambié mi equipo desde la última vez. También cambié de opinión sobre algunas cosas. Sobre vos, por ejemplo.",
  145: "Llegaste hasta acá. Antes del próximo combate necesito escucharte, sin público y sin hacernos los fuertes.",
  195: "Estamos frente a la última grieta. No te prometo que vaya a salir bien. Te prometo decirte la verdad y estar acá.",
};

export function conversationFor(event: FracturaStoryEvent, state: FracturaRunState): FracturaDialogueLine[] {
  if (event.dialogue) {
    return [...event.dialogue];
  }
  const voice = VOICES[getRival(state).id];
  const hostile = state.relationship.rivalry >= 55;
  return [
    {
      speaker: "narrator",
      text: event.intro,
      pose: 0,
      effect: [10, 30, 49, 195].includes(event.afterWave) ? "signal" : undefined,
    },
    {
      speaker: "rival",
      text: hostile
        ? `No olvidé lo que pasó. Podemos resolver esto, pero no voy a actuar como si confiara ciegamente. ${CHAPTER_WORDS[event.afterWave] ?? voice.question}`
        : (CHAPTER_WORDS[event.afterWave] ?? voice.question),
      pose: hostile ? 2 : 1,
    },
    {
      speaker: "player",
      text: [20, 55, 75].includes(event.afterWave)
        ? "Te escucho. Esta vez podemos hablar sin que haya un combate de por medio."
        : "Contame lo que encontraste. Después quiero elegir qué hacemos.",
      pose: 0,
    },
    { speaker: "rival", text: [20, 55, 75].includes(event.afterWave) ? voice.personal : voice.question, pose: 1 },
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
  const voice = VOICES[getRival(state).id];
  const friendly =
    !choice.hint?.includes("enemistad") && (!previous || state.relationship.trust >= previous.relationship.trust);
  const competitive = previous && state.relationship.rivalry > previous.relationship.rivalry;
  const answer = choice.reply ?? (friendly ? (competitive ? voice.compete : voice.agree) : voice.hurt);
  const romantic = friendly && relationshipLabel(state) === "Romance";
  return [
    { speaker: "player", text: choice.label.endsWith("?") ? choice.label : `${choice.label}.`, pose: 0 },
    {
      speaker: "rival",
      text: romantic ? `Me alegra que me lo hayas dicho. ${answer}` : answer,
      pose: friendly ? 1 : 2,
      effect: romantic ? "glow" : undefined,
    },
    { speaker: "narrator", text: result, pose: 0 },
  ];
}

export function battleRivalLossWords(state: FracturaRunState): string {
  return state.relationship.rivalry >= 55
    ? "Esta vez gané yo. No espero que lo aceptes con una sonrisa.$Si volvemos a encontrarnos, voy a recordar lo que elegiste."
    : "El combate terminó, pero no voy a dejarte acá.$Respirá. Voy a acompañarte hasta un lugar seguro.";
}

export function battleRivalWords(state: FracturaRunState, wave: number, victory = false): string {
  const voice = VOICES[getRival(state).id];
  if (victory) {
    return state.relationship.rivalry >= 55
      ? `${voice.hurt}$No terminó acá. Nos volveremos a encontrar.`
      : `Esta ronda es tuya. Aprendí algo al verte pelear.$${voice.agree}`;
  }
  if (state.relationship.rivalry >= 55) {
    return `No vine para una conversación amable.$${voice.hurt}`;
  }
  if (relationshipLabel(state) === "Romance") {
    return "Me alegra verte de nuevo. No voy a dejarte ganar por eso.$Después del combate quiero un rato con vos, sin nadie más.";
  }
  return `${wave < 20 ? getRival(state).greeting : voice.compete}$Elegí tus movimientos. Quiero conocer de verdad a tu equipo.`;
}
