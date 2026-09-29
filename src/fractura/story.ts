import { globalScene } from "#app/global-scene";

export interface FracturaStoryState {
  investigation: number;
  compassion: number;
  defiance: number;
  completedEvents: string[];
  flags: Record<string, boolean>;
  build?: "critical" | "rain" | "recovery";
  relic?: "ember" | "tide" | "ward";
  route?: { kind: "camp" | "cache" | "danger"; nextWave: number };
}

export interface FracturaStoryChoice {
  readonly label: string;
  readonly resultText: string;
  readonly reward?: "VOUCHER" | "VOUCHER_PLUS" | "MAP" | "ABILITY_CHARM" | "SHINY_CHARM" | "EXP_CHARM";
  readonly healParty?: boolean;
  readonly apply: (state: FracturaStoryState) => void;
}

export interface FracturaStoryEvent {
  readonly id: string;
  readonly afterWave: number;
  readonly requiresFlag?: string;
  readonly title: string;
  readonly intro: string;
  readonly choices: readonly FracturaStoryChoice[];
}

const defaultState = (): FracturaStoryState => ({
  investigation: 0,
  compassion: 0,
  defiance: 0,
  completedEvents: [],
  flags: {},
});

function storageKey(): string {
  return `pokerogue-fractura-story:${globalScene.seed || "local"}`;
}

export function loadFracturaStoryState(): FracturaStoryState {
  if (typeof localStorage === "undefined") {
    return defaultState();
  }
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) {
      return defaultState();
    }
    return { ...defaultState(), ...JSON.parse(raw) } as FracturaStoryState;
  } catch {
    return defaultState();
  }
}

export function saveFracturaStoryState(state: FracturaStoryState): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(storageKey(), JSON.stringify(state));
}

export function applyFracturaStoryChoice(event: FracturaStoryEvent, choice: FracturaStoryChoice): FracturaStoryState {
  const state = loadFracturaStoryState();
  choice.apply(state);
  if (!state.completedEvents.includes(event.id)) {
    state.completedEvents.push(event.id);
  }
  saveFracturaStoryState(state);
  return state;
}

const storyEvents: readonly FracturaStoryEvent[] = [
  {
    id: "signal-in-the-grass",
    afterWave: 10,
    title: "La señal imposible",
    intro:
      "Tu Pokédex recibe una señal que no pertenece a ninguna red conocida. Viene de una zona que debería estar vacía, pero varios Pokémon huyen de allí.",
    choices: [
      {
        label: "Investigar la señal",
        resultText: "Guardás cada fragmento de datos. Algo está manipulando las rutas entre biomas.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.investigation += 2;
          state.flags.followedSignal = true;
        },
      },
      {
        label: "Ayudar a los Pokémon que huyen",
        resultText:
          "Priorizás a los Pokémon heridos. Uno de ellos deja caer un voucher antes de internarse en el bosque.",
        reward: "VOUCHER",
        apply: state => {
          state.compassion += 2;
          state.flags.helpedRefugees = true;
        },
      },
      {
        label: "Perseguir a quien causó esto",
        resultText: "Encontrás huellas recientes y decidís no esperar. Alguien sabe que lo estás siguiendo.",
        reward: "VOUCHER",
        apply: state => {
          state.defiance += 2;
          state.flags.huntedUmbral = true;
        },
      },
    ],
  },
  {
    id: "fractura-build",
    afterWave: 15,
    title: "Elegí tu especialidad",
    intro:
      "Un investigador te ofrece tres prototipos para el resto de esta partida. Elegí el estilo que mejor combine con tu equipo; podés cambiarlo en una nueva run.",
    choices: [
      {
        label: "Instinto crítico",
        resultText: "Tus ataques ganan un nivel de probabilidad de crítico durante esta partida.",
        apply: state => {
          state.build = "critical";
        },
      },
      {
        label: "Control de lluvia",
        resultText: "Cada nuevo combate empezará con lluvia, salvo cuando un jefe altere el clima.",
        apply: state => {
          state.build = "rain";
        },
      },
      {
        label: "Reserva de campaña",
        resultText: "Tu equipo recibirá una curación al superar cada décima oleada.",
        apply: state => {
          state.build = "recovery";
        },
      },
    ],
  },
  {
    id: "camp-before-the-lab",
    afterWave: 20,
    title: "Campamento al anochecer",
    intro:
      "Encontrás un refugio junto a tres caminos. Podés revisar los mapas, cuidar a los Pokémon que llegaron heridos o preparar provisiones para cruzar la zona peligrosa.",
    choices: [
      {
        label: "Estudiar los mapas",
        resultText:
          "Anotás las rutas de abastecimiento de UMBRAL. Una marca señala dónde buscar después del laboratorio.",
        reward: "MAP",
        apply: state => {
          state.investigation += 2;
          state.flags.campMapped = true;
        },
      },
      {
        label: "Atender a los heridos",
        resultText: "Atendés a los Pokémon heridos. Un viajero te deja un amuleto shiny y promete volver.",
        reward: "SHINY_CHARM",
        apply: state => {
          state.compassion += 2;
          state.flags.campHelped = true;
        },
      },
      {
        label: "Preparar la expedición",
        resultText: "Guardás recursos y organizás una entrada rápida al siguiente sector.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.defiance += 2;
          state.flags.campPrepared = true;
        },
      },
    ],
  },
  {
    id: "fractura-relic",
    afterWave: 25,
    title: "Reliquia del sendero",
    intro:
      "Entre las ruinas hay tres reliquias que afectan a todo tu equipo durante esta partida. Solo podés llevarte una. Combiná sus efectos con la especialidad que elegiste.",
    choices: [
      {
        label: "Brasa: fuego +20%",
        resultText: "La Brasa amplifica un 20% el daño de los ataques de fuego de todo tu equipo.",
        apply: state => {
          state.relic = "ember";
        },
      },
      {
        label: "Marea: agua +20%",
        resultText: "La Marea amplifica un 20% el daño de los ataques de agua de todo tu equipo.",
        apply: state => {
          state.relic = "tide";
        },
      },
      {
        label: "Coraza: daño -10%",
        resultText: "La Coraza reduce un 10% el daño de ataques recibido por todo tu equipo.",
        apply: state => {
          state.relic = "ward";
        },
      },
    ],
  },
  {
    id: "umbral-route-lab",
    afterWave: 30,
    requiresFlag: "followedUmbralRoute",
    title: "El rastro de UMBRAL",
    intro:
      "La ruta que elegiste te lleva a un laboratorio todavía activo. Una terminal anuncia que el próximo experimento necesita Pokémon vivos. Podés entrar sin ser visto, liberar a los cautivos o sabotear la máquina.",
    choices: [
      {
        label: "Robar los datos del experimento",
        resultText:
          "Conseguís las coordenadas de otra instalación de UMBRAL. Sus investigadores ahora saben que estuviste acá.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.investigation += 3;
          state.flags.stoleLabData = true;
        },
      },
      {
        label: "Liberar a los Pokémon",
        resultText: "Escapan antes de que suenen las alarmas. En la confusión encontrás un voucher abandonado.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.compassion += 3;
          state.flags.freedLabPokemon = true;
        },
      },
      {
        label: "Sabotear la máquina",
        resultText: "Detenés el experimento y recogés una pieza que todavía funciona.",
        reward: "ABILITY_CHARM",
        apply: state => {
          state.defiance += 3;
          state.flags.sabotagedUmbralLab = true;
        },
      },
    ],
  },
  {
    id: "abandoned-lab",
    afterWave: 30,
    title: "Laboratorio sin nombre",
    intro:
      "Una ruta lateral conduce a un laboratorio abandonado. Las terminales todavía muestran datos de captura, variantes shiny y un proyecto llamado UMBRAL.",
    choices: [
      {
        label: "Copiar los archivos",
        resultText:
          "Descubrís que UMBRAL intenta forzar encuentros extremadamente raros alterando la probabilidad del entorno.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.investigation += 3;
          state.flags.stoleLabData = true;
        },
      },
      {
        label: "Liberar a los Pokémon retenidos",
        resultText:
          "Abrís las cápsulas antes de revisar nada más. Los Pokémon escapan y uno de ellos se queda unos segundos mirándote antes de irse.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.compassion += 3;
          state.flags.freedLabPokemon = true;
        },
      },
      {
        label: "Tomar la tecnología útil",
        resultText:
          "No confiás en UMBRAL, pero tampoco desperdiciás una ventaja. Te llevás un dispositivo experimental.",
        reward: "ABILITY_CHARM",
        apply: state => {
          state.defiance += 2;
          state.investigation += 1;
          state.flags.tookUmbralTech = true;
        },
      },
    ],
  },
  {
    id: "camp-map-payoff",
    afterWave: 40,
    requiresFlag: "campMapped",
    title: "La ruta de los mapas",
    intro:
      "Reconocés una marca que viste en el campamento: un depósito oculto de UMBRAL. Alguien dejó material útil antes de huir.",
    choices: [
      {
        label: "Recuperar los suministros",
        resultText: "Encontrás un voucher y nuevas pistas sobre la fractura.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.investigation += 2;
          state.flags.foundUmbralCache = true;
        },
      },
      {
        label: "Destruir el depósito",
        resultText: "UMBRAL perdió sus suministros. Conservás un dispositivo que todavía funciona.",
        reward: "ABILITY_CHARM",
        apply: state => {
          state.defiance += 2;
          state.flags.destroyedUmbralCache = true;
        },
      },
    ],
  },
  {
    id: "camp-help-payoff",
    afterWave: 40,
    requiresFlag: "campHelped",
    title: "Una deuda saldada",
    intro:
      "El viajero del campamento vuelve con noticias: varios Pokémon escaparon de UMBRAL y necesitan que alguien los guíe.",
    choices: [
      {
        label: "Escoltar a los fugitivos",
        resultText:
          "Llegan a salvo. El viajero te entrega un Amuleto Shiny. Los fugitivos te muestran cómo enfriar el núcleo de UMBRAL: en la oleada 50 lloverá durante el combate.",
        reward: "SHINY_CHARM",
        apply: state => {
          state.compassion += 2;
          state.flags.escortedRefugees = true;
          state.flags.bossForcedRain = true;
        },
      },
      {
        label: "Pedir información sobre UMBRAL",
        resultText:
          "Recibís las coordenadas y un Voucher Plus. Con esa información podrás preparar el generador de la oleada 50.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.investigation += 2;
          state.flags.learnedUmbralLocation = true;
        },
      },
    ],
  },
  {
    id: "camp-prepared-payoff",
    afterWave: 40,
    requiresFlag: "campPrepared",
    title: "La expedición preparada",
    intro:
      "Las provisiones que organizaste alcanzan para atravesar una ruta vigilada. Un convoy de UMBRAL transporta tecnología y vouchers.",
    choices: [
      {
        label: "Interceptar el convoy",
        resultText: "Tomás un componente experimental antes de que lleguen refuerzos.",
        reward: "ABILITY_CHARM",
        apply: state => {
          state.defiance += 2;
          state.flags.interceptedConvoy = true;
        },
      },
      {
        label: "Seguirlo sin ser visto",
        resultText: "Descubrís otra base de UMBRAL y recuperás un voucher en el camino.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.investigation += 2;
          state.flags.trackedConvoy = true;
        },
      },
    ],
  },
  {
    id: "umbral-boss-preparation",
    afterWave: 49,
    title: "El núcleo de UMBRAL",
    intro:
      "UMBRAL conecta un generador al próximo campo de batalla. La máquina altera el clima; lo que aprendiste en el laboratorio y en las rutas puede ayudarte a anticiparlo.",
    choices: [
      {
        label: "Aplicar lo aprendido",
        resultText: "Preparás al equipo con las pistas reunidas. El generador reaccionará a tus decisiones anteriores.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.flags.bossUsedPlan = true;
        },
      },
      {
        label: "Romper el generador",
        resultText: "El núcleo se rompe y levanta una tormenta de arena sobre el campo de batalla.",
        reward: "ABILITY_CHARM",
        apply: state => {
          state.flags.bossForcedStorm = true;
        },
      },
      {
        label: "Abrir el refrigerante",
        resultText: "Una lluvia intensa enfría la máquina antes del combate.",
        reward: "SHINY_CHARM",
        apply: state => {
          state.flags.bossForcedRain = true;
        },
      },
    ],
  },
  {
    id: "fracture-choice",
    afterWave: 60,
    title: "La primera fractura",
    intro:
      "La señal reaparece y el espacio parece doblarse. Del otro lado se distinguen Pokémon que normalmente jamás aparecerían en esta zona.",
    choices: [
      {
        label: "Estabilizar la fractura",
        resultText:
          "Reducís el peligro, pero conservás una lectura precisa de su energía. UMBRAL perderá control sobre esta zona.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.compassion += 2;
          state.investigation += 2;
          state.flags.stabilizedFracture = true;
        },
      },
      {
        label: "Entrar antes de que se cierre",
        resultText: "Te arriesgás y atravesás la anomalía. Algo raro responde a tu presencia.",
        reward: "SHINY_CHARM",
        apply: state => {
          state.defiance += 3;
          state.flags.enteredFracture = true;
        },
      },
      {
        label: "Marcar la zona y seguir a UMBRAL",
        resultText: "Dejás la anomalía intacta y seguís una transmisión cifrada. Ahora tenés una dirección concreta.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.investigation += 3;
          state.flags.trackedUmbral = true;
        },
      },
    ],
  },
  {
    id: "rival-truce",
    afterWave: 55,
    title: "Una tregua bajo las estrellas",
    intro:
      "Después del combate, tu rival espera junto al campamento. Admite que le preocupaba perderte en la ruta de UMBRAL. Te pregunta si pueden recorrer el próximo tramo juntos.",
    choices: [
      {
        label: "Quedarnos a conversar",
        resultText:
          "Compartís historias hasta que amanece. Te toma la mano por un instante y promete encontrarte de nuevo. La relación con tu rival se acerca; recibís un Voucher Plus.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.flags.rivalRomance = true;
          state.flags.rivalTruce = true;
        },
      },
      {
        label: "Viajar como compañeros",
        resultText:
          "Tu rival sonríe y acuerdan cuidarse mutuamente, sin apresurar nada. Su amistad crece; recibís un Voucher Plus.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.flags.rivalTruce = true;
        },
      },
      {
        label: "Seguir por separado",
        resultText: "Respetan sus caminos. Tu rival te deja provisiones y acuerdan verse en la próxima batalla.",
        reward: "EXP_CHARM",
        apply: state => {
          state.flags.rivalIndependent = true;
        },
      },
    ],
  },
  {
    id: "rival-reunion",
    afterWave: 95,
    requiresFlag: "rivalTruce",
    title: "El reencuentro",
    intro:
      "Tu rival vuelve tras el combate. Esta vez conoce una entrada oculta a UMBRAL, pero primero quiere saber si todavía confiás en lo que construyeron juntos.",
    choices: [
      {
        label: "Confiar en tu rival",
        resultText:
          "Te entrega sus mapas y avanzan juntos. El vínculo que eligieron conservar se fortalece. Conseguís un Amuleto Habilidad.",
        reward: "ABILITY_CHARM",
        apply: state => {
          state.flags.rivalTrusted = true;
          state.investigation += 2;
        },
      },
      {
        label: "Investigar por tu cuenta",
        resultText: "Tu rival acepta tu cautela y deja las coordenadas en tus manos. Conseguís un Voucher Plus.",
        reward: "VOUCHER_PLUS",
        apply: state => {
          state.flags.rivalTrusted = false;
          state.investigation += 1;
        },
      },
    ],
  },
];

export function getFracturaStoryEvent(afterWave: number): FracturaStoryEvent | undefined {
  const state = loadFracturaStoryState();
  if (storyEvents.some(event => event.afterWave === afterWave && state.completedEvents.includes(event.id))) {
    return undefined;
  }
  return storyEvents.find(
    event =>
      event.afterWave === afterWave
      && (!event.requiresFlag || state.flags[event.requiresFlag])
      && !state.completedEvents.includes(event.id),
  );
}
