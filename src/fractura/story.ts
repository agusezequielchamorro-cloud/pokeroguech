import { globalScene } from "#app/global-scene";
import { getFracturaChapter } from "./chapters";
import { conversationFor, type FracturaDialogueLine, responseFor } from "./dialogue";
import { ambientEncounter } from "./encounters";
import { loadFracturaProfile, saveFracturaProfile } from "./profile";
import {
  type ConsumableId,
  createFracturaRun,
  type FracturaRunState,
  getRival,
  normalizeFracturaRun,
} from "./run-state";
export type FracturaStoryState = FracturaRunState;
export interface FracturaStoryChoice {
  readonly label: string;
  readonly spoken?: string;
  readonly resultText: string;
  readonly reward?: "VOUCHER" | "VOUCHER_PLUS" | "MAP" | "ABILITY_CHARM" | "SHINY_CHARM" | "EXP_CHARM";
  readonly healParty?: boolean;
  readonly healFraction?: number | undefined;
  readonly reply?: string;
  readonly hint?: string;
  readonly consumable?: ConsumableId;
  readonly extraConsumable?: ConsumableId;
  readonly tokens?: number;
  readonly unlockWorkshop?: boolean;
  readonly apply: (state: FracturaStoryState) => void;
}
export interface FracturaStoryEvent {
  readonly id: string;
  readonly afterWave: number;
  readonly requiresFlag?: string;
  readonly title: string;
  readonly intro: string;
  readonly choices: readonly FracturaStoryChoice[];
  readonly environment?: number;
  readonly speaker?: string;
  readonly portrait?: number;
  readonly question?: string;
  readonly sceneProp?: number;
  readonly dialogue?: readonly FracturaDialogueLine[];
  readonly ambient?: boolean;
}
const defaultState = (): FracturaStoryState =>
  createFracturaRun(globalScene.seed || "local", loadFracturaProfile().lastRivalId);
const memory = new Map<string, FracturaStoryState>();
function storageKey(): string {
  return "pokerogue-fractura-story:" + (globalScene.seed || "local");
}
export function loadFracturaStoryState(): FracturaStoryState {
  if (typeof localStorage === "undefined") {
    return defaultState();
  }
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? normalizeFracturaRun(JSON.parse(raw), globalScene.seed || "local") : defaultState();
  } catch {
    return normalizeFracturaRun(memory.get(storageKey()), globalScene.seed || "local");
  }
}
export function saveFracturaStoryState(state: FracturaStoryState): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  const safe = normalizeFracturaRun(state, globalScene.seed || "local");
  safe.updatedAt = Date.now();
  memory.set(storageKey(), safe);
  const profile = loadFracturaProfile();
  if (profile.lastRivalId !== safe.rivalId) {
    profile.lastRivalId = safe.rivalId;
    saveFracturaProfile(profile);
  }
  try {
    localStorage.setItem(storageKey(), JSON.stringify(safe));
  } catch {
    /* Preserve in memory when storage is unavailable. */
  }
}
export function restoreFracturaRun(saved: unknown): void {
  const restored = normalizeFracturaRun(saved, globalScene.seed || "local");
  if (loadFracturaStoryState().updatedAt <= restored.updatedAt) {
    saveFracturaStoryState(restored);
  }
}
export function applyFracturaStoryChoice(event: FracturaStoryEvent, choice: FracturaStoryChoice): FracturaStoryState {
  const state = loadFracturaStoryState();
  if (state.completedEvents.includes(event.id)) {
    return state;
  }
  const previous = structuredClone(state);
  choice.apply(state);
  if (event.ambient) {
    state.lastAmbientWave = event.afterWave;
  }
  state.completedEvents.push(event.id);
  const rival = getRival(state);
  const lines = [
    ...conversationFor(event, previous),
    ...responseFor(event, event.choices.indexOf(choice), state, choice.resultText, previous),
  ];
  state.journal.push({
    eventId: event.id,
    wave: event.afterWave,
    title: event.title,
    choice: choice.label,
    consequence: choice.resultText,
    speaker: rival.name,
    dialogue: lines.map(
      l => (l.speaker === "rival" ? rival.name : l.speaker === "player" ? "Tú" : "Narración") + ": " + l.text,
    ),
  });
  state.journal = state.journal.slice(-40);
  saveFracturaStoryState(state);
  return state;
}
const LEGACY_EVENTS: Record<number, string[]> = {
  10: ["signal-in-the-grass"],
  15: ["fractura-build"],
  20: ["camp-before-the-lab"],
  25: ["fractura-relic"],
  30: ["umbral-route-lab", "abandoned-lab"],
  40: ["camp-map-payoff", "camp-help-payoff", "camp-prepared-payoff"],
  49: ["umbral-boss-preparation"],
  55: ["rival-truce"],
  60: ["fracture-choice"],
  95: ["rival-reunion"],
};
export function getFracturaStoryEvent(afterWave: number): FracturaStoryEvent | undefined {
  const state = loadFracturaStoryState();
  if (
    state.completedEvents.includes("chapter-" + afterWave)
    || LEGACY_EVENTS[afterWave]?.some(id => state.completedEvents.includes(id))
  ) {
    return undefined;
  }
  const chapter = getFracturaChapter(afterWave, state);
  if (chapter && !state.completedEvents.includes(chapter.id)) {
    return chapter;
  }
  return ambientEncounter(
    {
      seed: globalScene.seed || "local",
      wave: afterWave,
      biome: globalScene.arena?.biomeId ?? 1,
      hurt: globalScene.getPlayerParty().some(p => !p.isFainted() && p.hp / p.getMaxHp() <= 0.5),
      mysteryEncounter: globalScene.currentBattle?.isBattleMysteryEncounter(),
    },
    state,
  );
}
