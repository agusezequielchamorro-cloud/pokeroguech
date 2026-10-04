import { describe, expect, it } from "vitest";
import { getFracturaChapter } from "../../../src/fractura/chapters";
import { applyForging, awardForgeShards, findForging, normalizeForgings } from "../../../src/fractura/forging";
import { normalizeFracturaProfile } from "../../../src/fractura/profile";
import { createFracturaRun, normalizeFracturaRun } from "../../../src/fractura/run-state";
import { teamSynergies } from "../../../src/fractura/synergies";

describe("Fractura forging and formations", () => {
  it("keeps each forging attached to its Pokémon and move through an exported save", () => {
    const state = createFracturaRun("forge");
    state.forgeShards = 8;
    expect(applyForging(state, { pokemonId: 7, moveId: 33, form: "echo", seal: "poison" }, "attack")).toBe("made");
    expect(applyForging(state, { pokemonId: 9, moveId: 33, form: "focus", seal: "none" }, "attack")).toBe("made");
    const restored = normalizeFracturaRun(JSON.parse(JSON.stringify(state)), "forge");
    expect(restored.forgeShards).toBe(2);
    expect(findForging(restored, 7, 33)?.form).toBe("echo");
    expect(findForging(restored, 9, 33)?.form).toBe("focus");
    expect(findForging(restored, 7, 34)).toBeUndefined();
    expect(normalizeFracturaRun({ rivalId: "vera" }, "old").moveForgings).toEqual([]);
  });
  it("does not charge twice or destroy a previous forging on an unaffordable replacement", () => {
    const state = createFracturaRun("budget");
    state.forgeShards = 2;
    const candidate = { pokemonId: 1, moveId: 33, form: "vital" as const, seal: "none" as const };
    expect(applyForging(state, candidate, "attack")).toBe("made");
    expect(applyForging(state, candidate, "attack")).toBe("same");
    expect(applyForging(state, { ...candidate, form: "echo", seal: "burn" }, "attack")).toBe("shards");
    expect(findForging(state, 1, 33)).toEqual(candidate);
    expect(applyForging(state, { ...candidate, form: "normal" }, "attack")).toBe("made");
    expect(state.forgeShards).toBe(0);
    expect(state.moveForgings).toEqual([]);
  });
  it("rejects unsupported attacks, offensive Protection components and malformed identities before payment", () => {
    const state = createFracturaRun("invalid");
    state.forgeShards = 9;
    const candidate = { pokemonId: 1, moveId: 182, form: "echo" as const, seal: "burn" as const };
    expect(applyForging(state, candidate, "guard")).toBe("unsupported");
    expect(applyForging(state, candidate, "unsupported")).toBe("unsupported");
    expect(applyForging(state, { ...candidate, pokemonId: -1 }, "attack")).toBe("unsupported");
    expect(state.forgeShards).toBe(9);
    expect(state.moveForgings).toEqual([]);
    expect(applyForging(state, { ...candidate, form: "vital", seal: "none" }, "guard")).toBe("made");
  });
  it("deduplicates rewards even after reload and ignores invalid wave numbers", () => {
    const state = createFracturaRun("rewards");
    for (const wave of [0, -10, 1, 10.5, Number.NaN]) {
      expect(awardForgeShards(state, wave)).toBe(false);
    }
    expect(awardForgeShards(state, 10)).toBe(true);
    const restored = normalizeFracturaRun(JSON.parse(JSON.stringify(state)), "rewards");
    expect(awardForgeShards(restored, 10)).toBe(false);
    expect(awardForgeShards(restored, 20)).toBe(true);
    expect(restored.forgeShards).toBe(4);
  });
  it("discards corrupt forging records and keeps the last valid configuration for a move", () => {
    const valid = { pokemonId: 1, moveId: 33, form: "echo", seal: "none" };
    expect(normalizeForgings([null, {}, { ...valid, form: "missing" }, valid, { ...valid, form: "focus" }])).toEqual([
      { ...valid, form: "focus" },
    ]);
  });
  it("counts dual types once per member and removes a synergy when a member faints", () => {
    const party = [
      { hp: 4, types: ["water", "grass"] },
      { hp: 2, types: ["water", "water"] },
      { hp: 1, types: ["water"] },
      { hp: 0, types: ["water", "grass"] },
    ];
    expect(teamSynergies(party).find(s => s.id === "water")).toMatchObject({ count: 3, active: true });
    expect(teamSynergies(party).find(s => s.id === "grass")).toMatchObject({ count: 1, active: false });
    party[2].hp = 0;
    expect(teamSynergies(party).find(s => s.id === "water")?.active).toBe(false);
  });
  it("offers forging supplies and closes each story with the chosen relationship and prior plan", () => {
    for (const storyId of ["umbral", "invasion", "eclipse"] as const) {
      const state = createFracturaRun("end");
      state.storyId = storyId;
      getFracturaChapter(18, state)!.choices[0].apply(state);
      expect(state.forgeShards).toBe(4);
      state.flags.endingResearch = true;
      const ending = getFracturaChapter(200, state)!;
      expect(ending.dialogue?.some(l => l.text.includes("Las pruebas que conservaste"))).toBe(true);
      expect(ending.choices.every(c => c.unlockEnding)).toBe(true);
      ending.choices[0].apply(state);
      expect(state.flags.storyWon).toBe(true);
      state.relationship.romance = true;
      expect(getFracturaChapter(200, state)!.dialogue?.at(-1)?.text).toContain("Quiero volver contigo");
      state.relationship.rivalry = 80;
      expect(getFracturaChapter(200, state)!.dialogue?.at(-1)?.text).toContain("adversarios");
    }
    expect(normalizeFracturaProfile({ endings: ["umbral", "umbral", "missing", "eclipse"] }).endings).toEqual([
      "umbral",
      "eclipse",
    ]);
  });
});
