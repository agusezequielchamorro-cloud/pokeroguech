import { globalScene } from "#app/global-scene";

export interface FracturaStoryState {
  investigation: number;
  compassion: number;
  defiance: number;
  completedEvents: string[];
  flags: Record<string, boolean>;
}

export interface FracturaStoryChoice {
  readonly label: string;
  readonly resultText: string;
  readonly reward?: "VOUCHER" | "VOUCHER_PLUS" | "MAP" | "ABILITY_CHARM" | "SHINY_CHARM";
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
        resultText: "Un viajero promete ayudarte si volvés a encontrarlo. Te deja un voucher como agradecimiento.",
        reward: "VOUCHER",
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
        resultText: "Llegan a salvo. El viajero te entrega una recompensa por el riesgo que corriste.",
        reward: "SHINY_CHARM",
        apply: state => {
          state.compassion += 2;
          state.flags.escortedRefugees = true;
        },
      },
      {
        label: "Pedir información sobre UMBRAL",
        resultText: "Te muestra las coordenadas de una instalación. También te entrega un voucher.",
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
