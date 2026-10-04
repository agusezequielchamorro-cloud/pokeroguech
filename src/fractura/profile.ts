import { type ConsumableId, RIVALS, type RivalId } from "./run-state";

/** Permanent unlocks and consumables; also embedded in exported system saves. */
export interface FracturaProfile {
  compass: boolean;
  rivalPalettes: string[];
  selectedPalette: string;
  inventory: Record<ConsumableId, number>;
  casinoTokens: number;
  casinoPlays: number;
  lastRivalId?: RivalId;
  workshopLicense: boolean;
  keepsakes: RivalId[];
}

export const RIVAL_PALETTES = {
  original: { label: "Original", tint: 0xffffff },
  indigo: { label: "Índigo", tint: 0x9fb6ff },
  cobre: { label: "Cobre", tint: 0xffbd8c },
} as const;

const KEY = "pokerogue-fractura-profile-v1";
let memory: FracturaProfile | null = null;
const bounded = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(9999, Math.floor(n))) : 0;

export function normalizeFracturaProfile(value: unknown): FracturaProfile {
  const saved = value && typeof value === "object" ? (value as Partial<FracturaProfile>) : {};
  const palettes = ["original", ...(Array.isArray(saved.rivalPalettes) ? saved.rivalPalettes : [])].filter(
    (v, i, values) => Object.hasOwn(RIVAL_PALETTES, v) && values.indexOf(v) === i,
  );
  return {
    compass: saved.compass === true,
    rivalPalettes: palettes,
    selectedPalette: palettes.includes(saved.selectedPalette ?? "") ? saved.selectedPalette! : "original",
    inventory: {
      tonic: bounded(saved.inventory?.tonic),
      lure: bounded(saved.inventory?.lure),
      shield: bounded(saved.inventory?.shield),
      prism: bounded(saved.inventory?.prism),
      remedy: bounded(saved.inventory?.remedy),
      ether: bounded(saved.inventory?.ether),
    },
    casinoTokens: bounded(saved.casinoTokens),
    casinoPlays: bounded(saved.casinoPlays),
    workshopLicense: saved.workshopLicense === true,
    keepsakes: Array.isArray(saved.keepsakes)
      ? [...new Set(saved.keepsakes.filter(id => RIVALS.some(r => r.id === id)))]
      : [],
    ...(RIVALS.some(r => r.id === saved.lastRivalId) ? { lastRivalId: saved.lastRivalId } : {}),
  };
}

export function loadFracturaProfile(): FracturaProfile {
  try {
    return normalizeFracturaProfile(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return normalizeFracturaProfile(memory);
  }
}

export function saveFracturaProfile(profile: FracturaProfile): void {
  memory = normalizeFracturaProfile(profile);
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* Storage unavailable: keep memory copy. */
  }
}

export function addConsumable(id: ConsumableId, amount = 1): void {
  const profile = loadFracturaProfile();
  profile.inventory[id] = Math.min(9999, profile.inventory[id] + amount);
  saveFracturaProfile(profile);
}

export const ROULETTE_REWARDS = [
  {
    id: "compass",
    label: "Brújula permanente",
    short: "Brújula",
    detail: "+1 Voucher al llegar a la oleada 10 de cada partida. Repetida: Voucher Plus.",
  },
  {
    id: "outfit",
    label: "Atuendo de rival",
    short: "Atuendo",
    detail: "Paleta índigo o cobre (50% cada una). Si está repetida: Voucher Plus.",
  },
  {
    id: "supplies",
    label: "Kit de expedición",
    short: "Kit",
    detail: "1 Tónico + 1 Sello protector para tu mochila permanente.",
  },
  { id: "rare", label: "Huevo raro", short: "Raro", detail: "Un huevo raro. Si tienes 99 huevos: Voucher Plus." },
  { id: "epic", label: "Huevo épico", short: "Épico", detail: "Un huevo épico. Si tienes 99 huevos: Voucher Plus." },
  {
    id: "legendary",
    label: "Huevo legendario",
    short: "Leyenda",
    detail: "Un huevo legendario. Si tienes 99 huevos: Voucher Plus.",
  },
  {
    id: "shiny",
    label: "Huevo shiny",
    short: "Shiny",
    detail: "Un huevo épico shiny. Si tienes 99 huevos: Voucher Plus.",
  },
  {
    id: "red",
    label: "Huevo shiny rojo",
    short: "★ Roja",
    detail: "Un huevo épico shiny rojo. Si tienes 99 huevos: Voucher Plus.",
  },
  {
    id: "prism",
    label: "Prisma + Señuelo",
    short: "Prisma",
    detail: "1 Prisma de reinvención + 1 Señuelo shiny. Se conservan entre partidas.",
  },
  { id: "plus", label: "Voucher Plus", short: "V+", detail: "Un Voucher Plus para la gacha de huevos." },
] as const;

export function rouletteIndex(random: number): number {
  return Math.min(9, Math.max(0, Math.floor(random * 10)));
}

/** A coin flip with no tie: each side wins with exactly 50% probability. */
export function casinoWon(selected: "sun" | "moon", random: number): boolean {
  return selected === (random < 0.5 ? "sun" : "moon");
}
