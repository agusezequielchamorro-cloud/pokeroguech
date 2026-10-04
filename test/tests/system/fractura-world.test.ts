import { BiomeId } from "#enums/biome-id";
import { describe, expect, it } from "vitest";
import { getFracturaChapter } from "../../../src/fractura/chapters";
import { craftConsumable, recipeCost } from "../../../src/fractura/crafting";
import { conversationFor, responseFor, splitSceneText } from "../../../src/fractura/dialogue";
import { ambientEncounter } from "../../../src/fractura/encounters";
import { personalMissionReady } from "../../../src/fractura/journal";
import { normalizeFracturaProfile } from "../../../src/fractura/profile";
import { createFracturaRun, normalizeFracturaRun, RIVALS } from "../../../src/fractura/run-state";
import { BIOME_SCENERY, sceneryFor } from "../../../src/fractura/scenery";
import { atlasRowCuts } from "../../../src/fractura/sprite-layout";
import { angleDelta, rouletteStopAngle, wheelSector } from "../../../src/fractura/wheel";

describe("Fractura living world", () => {
  it("changes the next rival while preserving saved runs and older state", () => {
    for (let i = 0; i < 30; i++) {
      const current = createFracturaRun(`world-${i}`);
      const next = createFracturaRun(`world-${i + 1}`, current.rivalId);
      expect(next.rivalId).not.toBe(current.rivalId);
      expect(normalizeFracturaRun(JSON.parse(JSON.stringify(current)), `world-${i}`)).toEqual(current);
    }
    expect(normalizeFracturaRun({ rivalId: "vera" }, "old").lastAmbientWave).toBe(0);
  });

  it("covers every biome and changes boss and story scenery with context", () => {
    const frames = Object.values(BiomeId).map(biome => {
      expect(BIOME_SCENERY[biome]).toBeDefined();
      return BIOME_SCENERY[biome].join(":");
    });
    expect(new Set(frames).size).toBe(35);
    expect(sceneryFor({ biome: BiomeId.END, finalBoss: true, awakened: true })).not.toEqual(
      sceneryFor({ biome: BiomeId.END, finalBoss: true }),
    );
    expect(sceneryFor({ biome: BiomeId.PLAINS, wave: 50, story: "invasion" })).not.toEqual(
      sceneryFor({ biome: BiomeId.PLAINS, wave: 50, story: "eclipse" }),
    );
    expect(sceneryFor({ biome: BiomeId.PLAINS, wave: 190, trainerBattle: true })).not.toEqual(
      sceneryFor({ biome: BiomeId.PLAINS }),
    );
  });

  it("offers contextual aid and leaves native events, authored chapters and cooldowns intact", () => {
    const state = createFracturaRun("ambient-test");
    const context = { seed: "ambient-test", wave: 12, biome: BiomeId.FOREST, hurt: true };
    expect(ambientEncounter(context, state)?.id).toBe("ambient-12-aid");
    expect(ambientEncounter({ ...context, mysteryEncounter: true }, state)).toBeUndefined();
    expect(ambientEncounter({ ...context, wave: 15 }, state)).toBeUndefined();
    state.lastAmbientWave = 9;
    expect(ambientEncounter(context, state)).toBeUndefined();
    state.lastAmbientWave = 0;
    state.completedEvents.push("ambient-12-aid");
    expect(ambientEncounter(context, state)).toBeUndefined();
    state.completedEvents = [];
    state.route = { kind: "cache", nextWave: 12 };
    const routeContext = { ...context, hurt: false };
    expect(ambientEncounter(routeContext, state)?.id).toBe("ambient-12-route");
    expect(ambientEncounter(routeContext, state)?.dialogue).toEqual(ambientEncounter(routeContext, state)?.dialogue);
  });

  it.each(RIVALS.map(rival => rival.id))("lets %s answer a hostile choice without a friendly reply", rivalId => {
    const before = createFracturaRun("relationship");
    before.rivalId = rivalId;
    const event = getFracturaChapter(55, before)!;
    const after = structuredClone(before);
    event.choices[2].apply?.(after);
    const lines = responseFor(event, 2, after, event.choices[2].resultText, before);
    expect(lines[0].text).toContain("Quiero seguir como tu adversario");
    expect(lines[1].pose).toBe(2);
    expect(lines[1].text).not.toContain("Me alegra");
    expect(conversationFor(event, before).some(line => line.speaker === "rival")).toBe(true);
  });

  it("lands the pointer on the paid prize after any drag angle", () => {
    for (const from of [-1092, -15, 0, 33, 359, 420]) {
      for (let prize = 0; prize < 10; prize++) {
        const stop = rouletteStopAngle(from, prize, 5);
        expect(stop - from).toBeGreaterThanOrEqual(1800);
        const angle = ((-90 - stop) * Math.PI) / 180;
        expect(wheelSector(Math.cos(angle), Math.sin(angle))).toBe(prize);
        expect(rouletteStopAngle(from, prize, 8) - stop).toBe(1080);
      }
    }
    expect(angleDelta(179, -179)).toBe(2);
    expect(angleDelta(-179, 179)).toBe(-2);
  });

  it("migrates old saves and ignores malformed journal entries and duplicate keepsakes", () => {
    const state = normalizeFracturaRun(
      {
        build: "rain",
        relic: "ward",
        companionQuest: "unknown",
        journal: [
          null,
          {},
          {
            eventId: "x",
            title: "x",
            choice: "x",
            consequence: "x",
            speaker: "Vera",
            wave: -1,
            dialogue: ["Vera: Sí.", 5],
          },
        ],
      },
      "old",
    );
    expect(state.build).toBe("rain");
    expect(state.relic).toBe("ward");
    expect(state.companionQuest).toBe("available");
    expect(state.journal).toHaveLength(1);
    expect(state.journal[0].wave).toBe(0);
    expect(state.journal[0].dialogue).toEqual(["Vera: Sí."]);
    const profile = normalizeFracturaProfile({ keepsakes: ["vera", "vera", "missing"], inventory: { tonic: 3 } });
    expect(profile.keepsakes).toEqual(["vera"]);
    expect(profile.inventory.tonic).toBe(3);
    expect(profile.inventory.ether).toBe(0);
    expect(profile.workshopLicense).toBe(false);
  });

  it("checks a complete purchase before changing funds or inventory", () => {
    const p = normalizeFracturaProfile({ casinoTokens: 1 });
    expect(craftConsumable(p, "tonic")).toBe("coins");
    expect(p.casinoTokens).toBe(1);
    expect(p.inventory.tonic).toBe(0);
    p.workshopLicense = true;
    expect(recipeCost(p, "tonic")).toBe(1);
    expect(craftConsumable(p, "tonic")).toBe("made");
    expect(p.casinoTokens).toBe(0);
    expect(p.inventory.tonic).toBe(1);
    p.casinoTokens = 4;
    p.inventory.tonic = 9999;
    expect(craftConsumable(p, "tonic")).toBe("full");
    expect(p.casinoTokens).toBe(4);
  });

  it.each(RIVALS.map(r => r.id))("resolves %s's personal mission only after its distinct requirement", rivalId => {
    const state = createFracturaRun("mission");
    state.rivalId = rivalId;
    state.companionQuest = "active";
    expect(personalMissionReady(state)).toBe(false);
    if (rivalId === "elian") {
      state.flags["visited-camp"] = true;
      state.flags["visited-cache"] = true;
    }
    if (rivalId === "vera") {
      state.relic = "ward";
    }
    if (rivalId === "nadir") {
      state.investigation = 5;
    }
    if (rivalId === "alma") {
      state.compassion = 5;
    }
    expect(personalMissionReady(state)).toBe(true);
    const event = getFracturaChapter(85, state)!;
    expect(event.choices[0].unlockWorkshop).toBe(true);
    event.choices[0].apply(state);
    expect(state.companionQuest).toBe("resolved");
    expect(getFracturaChapter(125, state)!.choices.every(choice => !choice.unlockWorkshop)).toBe(true);
  });

  it("lets interest develop without forcing romance and supports an explicit later relationship or separation", () => {
    const state = createFracturaRun("romance");
    getFracturaChapter(55, state)!.choices[0].apply(state);
    expect(state.relationship.romance).toBe(false);
    expect(state.flags.romanceInterest).toBe(true);
    state.relationship.trust = 70;
    state.relationship.affection = 45;
    state.relationship.rivalry = 10;
    getFracturaChapter(175, state)!.choices[0].apply(state);
    expect(state.relationship.romance).toBe(true);
    getFracturaChapter(175, state)!.choices[2].apply(state);
    expect(state.relationship.romance).toBe(false);
    expect(state.flags.romanceInterest).toBe(false);
  });

  it("preserves every sentence and word when splitting dialogue by measured page capacity", () => {
    const text =
      "Primera frase completa. Segunda frase un poco más larga para comprobar el salto de página. ¿Seguimos? Sí, seguimos juntos.";
    const pages = splitSceneText(text, 60);
    expect(pages.join(" ")).toBe(text);
    expect(pages.every(p => p.length <= 60)).toBe(true);
    expect(pages[0]).toBe("Primera frase completa.");
    const measured = splitSceneText(text, 999, page => page.length <= 42);
    expect(measured.join(" ")).toBe(text);
    expect(measured.every(p => p.length <= 42)).toBe(true);
  });

  it("uses a story-specific location instead of forcing every plot into a laboratory", () => {
    const state = createFracturaRun("context");
    state.storyId = "invasion";
    expect(getFracturaChapter(30, state)!.title).toBe("El almacén ocupado");
    state.storyId = "eclipse";
    expect(getFracturaChapter(30, state)!.title).toBe("El altar abierto");
  });

  it("cuts uneven atlas rows inside their transparent gutters", () => {
    const width = 40;
    const height = 400;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (const [top, bottom] of [
      [12, 103],
      [123, 203],
      [223, 300],
      [322, 390],
    ]) {
      for (let y = top; y <= bottom; y++) {
        for (let x = 6; x < 34; x++) {
          pixels[(y * width + x) * 4 + 3] = 255;
        }
      }
    }
    const cuts = atlasRowCuts(pixels, width, height);
    expect(cuts[1]).toBeGreaterThan(103);
    expect(cuts[1]).toBeLessThan(123);
    expect(cuts[2]).toBeGreaterThan(203);
    expect(cuts[2]).toBeLessThan(223);
    expect(cuts[3]).toBeGreaterThan(300);
    expect(cuts[3]).toBeLessThan(322);
  });
});
