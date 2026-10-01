import { BiomeId } from "#enums/biome-id";
import { describe, expect, it } from "vitest";
import { getFracturaChapter } from "../../../src/fractura/chapters";
import { conversationFor, responseFor } from "../../../src/fractura/dialogue";
import { ambientEncounter } from "../../../src/fractura/encounters";
import { createFracturaRun, normalizeFracturaRun, RIVALS } from "../../../src/fractura/run-state";
import { BIOME_SCENERY, sceneryFor } from "../../../src/fractura/scenery";
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
    expect(lines[0].text).toContain("Voy a ser tu peor enemigo");
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
});
