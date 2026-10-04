import type { FracturaRunState } from "./run-state";

export const FORGE_FORMS = {
  normal: { name: "Sin forma", detail: "Conserva la mecánica original del movimiento.", cost: 0 },
  echo: {
    name: "Eco",
    detail: "Añade un impacto, hasta un máximo de 5. Cada impacto usa 65% de la potencia original.",
    cost: 2,
  },
  focus: { name: "Precisión", detail: "Aumenta en 1 el nivel de probabilidad de golpe crítico.", cost: 2 },
  vital: {
    name: "Vital",
    detail: "Si el ataque causa daño, cura 6% de tus PS máximos una vez por uso. Protección cura 10% si funciona.",
    cost: 2,
  },
} as const;
export const FORGE_SEALS = {
  none: { name: "Sin sello", detail: "No añade un estado alterado.", cost: 0 },
  paralysis: {
    name: "Chispa",
    detail: "Cada impacto que causa daño tiene 10% de probabilidad de paralizar. Respeta inmunidades y habilidades.",
    cost: 2,
  },
  burn: {
    name: "Ascua",
    detail: "Cada impacto que causa daño tiene 10% de probabilidad de quemar. Respeta inmunidades y habilidades.",
    cost: 2,
  },
  poison: {
    name: "Toxina",
    detail: "Cada impacto que causa daño tiene 10% de probabilidad de envenenar. Respeta inmunidades y habilidades.",
    cost: 2,
  },
} as const;
export type ForgeFormId = keyof typeof FORGE_FORMS;
export type ForgeSealId = keyof typeof FORGE_SEALS;
export interface MoveForging {
  pokemonId: number;
  moveId: number;
  form: ForgeFormId;
  seal: ForgeSealId;
}
export type ForgeMoveKind = "attack" | "guard" | "unsupported";

export function normalizeForgings(value: unknown): MoveForging[] {
  const entries = new Map<string, MoveForging>();
  if (!Array.isArray(value)) {
    return [];
  }
  for (const item of value.slice(-192)) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const f = item as MoveForging;
    if (
      !Number.isInteger(f.pokemonId)
      || f.pokemonId < 0
      || f.pokemonId > 0xffffffff
      || !Number.isInteger(f.moveId)
      || f.moveId <= 0
      || f.moveId > 9999
      || !Object.hasOwn(FORGE_FORMS, f.form)
      || !Object.hasOwn(FORGE_SEALS, f.seal)
      || (f.form === "normal" && f.seal === "none")
    ) {
      continue;
    }
    entries.set(f.pokemonId + ":" + f.moveId, { pokemonId: f.pokemonId, moveId: f.moveId, form: f.form, seal: f.seal });
  }
  return [...entries.values()].slice(-96);
}
export function findForging(state: FracturaRunState, pokemonId: number, moveId: number): MoveForging | undefined {
  return state.moveForgings.find(f => f.pokemonId === pokemonId && f.moveId === moveId);
}
export function forgingCost(form: ForgeFormId, seal: ForgeSealId): number {
  return FORGE_FORMS[form].cost + FORGE_SEALS[seal].cost;
}
export function validForging(kind: ForgeMoveKind, form: ForgeFormId, seal: ForgeSealId): boolean {
  return kind === "attack" || (kind === "guard" && (form === "normal" || form === "vital") && seal === "none");
}
/** A complete purchase is validated before funds or the previous forging are changed. */
export function applyForging(
  state: FracturaRunState,
  candidate: MoveForging,
  kind: ForgeMoveKind,
): "made" | "same" | "shards" | "unsupported" {
  if (
    !Number.isInteger(candidate.pokemonId)
    || candidate.pokemonId < 0
    || candidate.pokemonId > 0xffffffff
    || !Number.isInteger(candidate.moveId)
    || candidate.moveId <= 0
    || candidate.moveId > 9999
    || !Object.hasOwn(FORGE_FORMS, candidate.form)
    || !Object.hasOwn(FORGE_SEALS, candidate.seal)
  ) {
    return "unsupported";
  }
  if (!validForging(kind, candidate.form, candidate.seal)) {
    return "unsupported";
  }
  const previous = findForging(state, candidate.pokemonId, candidate.moveId);
  if (
    (previous?.form === candidate.form && previous.seal === candidate.seal)
    || (!previous && candidate.form === "normal" && candidate.seal === "none")
  ) {
    return "same";
  }
  const cost = forgingCost(candidate.form, candidate.seal);
  if (state.forgeShards < cost) {
    return "shards";
  }
  state.forgeShards -= cost;
  state.moveForgings = state.moveForgings.filter(
    f => f.pokemonId !== candidate.pokemonId || f.moveId !== candidate.moveId,
  );
  if (candidate.form !== "normal" || candidate.seal !== "none") {
    state.moveForgings.push({ ...candidate });
  }
  return "made";
}
export function awardForgeShards(state: FracturaRunState, wave: number): boolean {
  if (!Number.isInteger(wave) || wave <= 0 || wave % 10 !== 0 || state.flags["forge-shards-" + wave]) {
    return false;
  }
  state.flags["forge-shards-" + wave] = true;
  state.forgeShards = Math.min(9999, state.forgeShards + 2);
  return true;
}
