/** Run data is independent of Phaser so saves and seeded generation can be checked in isolation. */
export const RIVALS = [
  {
    id: "elian",
    name: "Elian",
    age: 26,
    role: "Explorador",
    color: 0x9cb8fa,
    female: false,
    greeting: "Voy a llegar antes que vos. Pero pienso asegurarme de que llegues.",
    frame: 0,
  },
  {
    id: "vera",
    name: "Vera",
    age: 27,
    role: "Cazadora de reliquias",
    color: 0xffbc88,
    female: true,
    greeting: "No me interesan las promesas. Mostrame qué elegís cuando cuesta.",
    frame: 1,
  },
  {
    id: "nadir",
    name: "Nadir",
    age: 28,
    role: "Investigador",
    color: 0x9ce0dc,
    female: false,
    greeting: "Las anomalías no me asustan. Perder a alguien por no entenderlas, sí.",
    frame: 2,
  },
  {
    id: "alma",
    name: "Alma",
    age: 25,
    role: "Médica de expedición",
    color: 0xb4dea0,
    female: true,
    greeting: "Podemos competir sin dejar a nadie atrás. Espero que vos también lo creas.",
    frame: 3,
  },
] as const;

export type RivalId = (typeof RIVALS)[number]["id"];
export type StoryId = "umbral" | "invasion" | "eclipse";
export type BuildId = "critical" | "rain" | "recovery";
export type RelicId = "ember" | "tide" | "ward";
export type ConsumableId = "tonic" | "lure" | "shield" | "prism";

export const STORIES = {
  umbral: { title: "El proyecto UMBRAL", goal: "Desmantelar los laboratorios de UMBRAL", environment: 2 },
  invasion: { title: "La ciudad sitiada", goal: "Proteger los refugios de la región", environment: 1 },
  eclipse: { title: "El dios del eclipse", goal: "Sellar una grieta que devora el cielo", environment: 2 },
} as const;

export interface FracturaRunState {
  version: 2;
  updatedAt: number;
  rivalId: RivalId;
  storyId: StoryId;
  relationship: { trust: number; affection: number; rivalry: number; romance: boolean };
  investigation: number;
  compassion: number;
  defiance: number;
  completedEvents: string[];
  flags: Record<string, boolean>;
  build?: BuildId;
  relic?: RelicId;
  route?: { kind: "camp" | "cache" | "danger"; nextWave: number };
  lureUntil: number;
  shieldUntil: number;
  routeHistory: { wave: number; label: string; kind: "camp" | "cache" | "danger" }[];
  lastAmbientWave: number;
}

export function seedHash(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

export function createFracturaRun(seed: string, previousRival?: RivalId): FracturaRunState {
  const storyIds: StoryId[] = ["umbral", "invasion", "eclipse"];
  let rivalIndex = seedHash(`${seed}:rival`) % RIVALS.length;
  if (RIVALS[rivalIndex].id === previousRival) {
    rivalIndex = (rivalIndex + 1 + (seedHash(`${seed}:alternate-rival`) % (RIVALS.length - 1))) % RIVALS.length;
  }
  return {
    version: 2,
    updatedAt: 0,
    rivalId: RIVALS[rivalIndex].id,
    storyId: storyIds[seedHash(`${seed}:story`) % storyIds.length],
    relationship: { trust: 12, affection: 0, rivalry: 12, romance: false },
    investigation: 0,
    compassion: 0,
    defiance: 0,
    completedEvents: [],
    flags: {},
    lureUntil: 0,
    shieldUntil: 0,
    routeHistory: [],
    lastAmbientWave: 0,
  };
}

function count(value: unknown, max = 99999): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
}

export function normalizeFracturaRun(value: unknown, seed: string): FracturaRunState {
  const base = createFracturaRun(seed);
  if (!value || typeof value !== "object") {
    return base;
  }
  const saved = value as Partial<FracturaRunState>;
  const rel = saved.relationship;
  const state: FracturaRunState = {
    ...base,
    updatedAt: count(saved.updatedAt, Number.MAX_SAFE_INTEGER),
    rivalId: RIVALS.some(r => r.id === saved.rivalId) ? saved.rivalId! : base.rivalId,
    storyId: saved.storyId && Object.hasOwn(STORIES, saved.storyId) ? saved.storyId : base.storyId,
    relationship: {
      trust: rel ? count(rel.trust, 100) : base.relationship.trust,
      affection: rel ? count(rel.affection, 100) : saved.flags?.rivalRomance ? 25 : 0,
      rivalry: rel ? count(rel.rivalry, 100) : base.relationship.rivalry,
      romance: rel?.romance === true || saved.flags?.rivalRomance === true,
    },
    investigation: count(saved.investigation),
    compassion: count(saved.compassion),
    defiance: count(saved.defiance),
    completedEvents: Array.isArray(saved.completedEvents)
      ? [...new Set(saved.completedEvents.filter(id => typeof id === "string"))]
      : [],
    flags:
      saved.flags && typeof saved.flags === "object"
        ? Object.fromEntries(Object.entries(saved.flags).filter(([, v]) => typeof v === "boolean"))
        : {},
    lureUntil: count(saved.lureUntil),
    shieldUntil: count(saved.shieldUntil),
    lastAmbientWave: count(saved.lastAmbientWave),
    routeHistory: Array.isArray(saved.routeHistory)
      ? saved.routeHistory
          .filter(
            r =>
              r
              && typeof r.label === "string"
              && Number.isFinite(r.wave)
              && ["camp", "cache", "danger"].includes(r.kind),
          )
          .slice(-6)
      : [],
  };
  if (saved.build && ["critical", "rain", "recovery"].includes(saved.build)) {
    state.build = saved.build;
  }
  if (saved.relic && ["ember", "tide", "ward"].includes(saved.relic)) {
    state.relic = saved.relic;
  }
  if (saved.route && ["camp", "cache", "danger"].includes(saved.route.kind) && Number.isFinite(saved.route.nextWave)) {
    state.route = saved.route;
  }
  return state;
}

export function getRival(state: FracturaRunState) {
  return RIVALS.find(r => r.id === state.rivalId)!;
}

export function changeRelationship(state: FracturaRunState, trust = 0, affection = 0, rivalry = 0): void {
  state.relationship.trust = count(state.relationship.trust + trust, 100);
  state.relationship.affection = count(state.relationship.affection + affection, 100);
  state.relationship.rivalry = count(state.relationship.rivalry + rivalry, 100);
}

export function relationshipLabel(state: FracturaRunState): string {
  const rel = state.relationship;
  if (rel.rivalry >= 55) {
    return "Enemistad";
  }
  if (rel.romance && rel.affection >= 35 && rel.trust >= 35) {
    return "Romance";
  }
  if (rel.trust >= 45) {
    return "Alianza";
  }
  if (rel.affection >= 20) {
    return "Cercanía";
  }
  return "Rivalidad";
}

export const CONSUMABLES = {
  tonic: {
    name: "Tónico de campamento",
    short: "Tónico",
    description: "Cura 25% de PS a los Pokémon conscientes y restaura 2 PP por movimiento.",
  },
  lure: {
    name: "Señuelo prisma",
    short: "Señuelo",
    description: "Duplica la probabilidad shiny de encuentros salvajes durante las próximas 5 oleadas.",
  },
  shield: {
    name: "Sello protector",
    short: "Sello",
    description: "Reduce 15% el daño de ataques recibido durante esta oleada y las 2 siguientes.",
  },
  prism: {
    name: "Prisma de reinvención",
    short: "Prisma",
    description: "Cambia tu build: crítico → lluvia → curación. Dura hasta el final de esta run.",
  },
} as const;

export const BUILD_LABELS: Record<BuildId, string> = {
  critical: "Instinto crítico",
  rain: "Control de lluvia",
  recovery: "Reserva vital",
};
export const RELIC_LABELS: Record<RelicId, string> = {
  ember: "Brasa · fuego +20%",
  tide: "Marea · agua +20%",
  ward: "Coraza · daño −10%",
};
