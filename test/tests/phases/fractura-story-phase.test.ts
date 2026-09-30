import { AbilityId } from "#enums/ability-id";
import { BiomeId } from "#enums/biome-id";
import { Button } from "#enums/buttons";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { UiMode } from "#enums/ui-mode";
import { FracturaStoryPhase } from "#phases/fractura-story-phase";
import { SelectBiomePhase } from "#phases/select-biome-phase";
import { GameManager } from "#test/framework/game-manager";
import type { FracturaRouteMapUiHandler } from "#ui/fractura-route-map-ui-handler";
import type { FracturaStoryUiHandler } from "#ui/fractura-story-ui-handler";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadFracturaProfile } from "../../../src/fractura/profile";
import { loadFracturaStoryState } from "../../../src/fractura/story";
// biome-ignore lint/performance/noNamespaceImport: Spy on scene rendering while exercising the real UI and reward callbacks.
import * as fracturaView from "../../../src/fractura/view";

describe("Fractura decisions", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .enemySpecies(SpeciesId.MAGIKARP)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH)
      .moveset(MoveId.SPLASH)
      .criticalHits(false);
    // The headless framework replaces Phaser drawing objects with incomplete mocks.
    // Rendering and text bounds are checked separately by qa/validate.mjs.
    vi.spyOn(fracturaView, "drawStoryView").mockReturnValue(null);
    vi.spyOn(fracturaView, "drawRouteView").mockImplementation(() => {});
    vi.spyOn(game.scene.gameData, "saveSystem").mockResolvedValue(true);
  });

  async function openScene(wave: number) {
    const phase = new FracturaStoryPhase(wave);
    const ended = vi.spyOn(phase, "end").mockImplementation(() => {});
    phase.start();
    await vi.waitFor(() => expect(game.scene.ui.mode).toBe(UiMode.FRACTURA_STORY));
    return { phase, ended, handler: game.scene.ui.getHandler() as FracturaStoryUiHandler };
  }

  function press(handler: FracturaStoryUiHandler) {
    game.scene.time.now += 250;
    return handler.processInput(Button.ACTION);
  }

  function reachChoices(handler: FracturaStoryUiHandler) {
    for (let i = 0; i < 10; i++) {
      const model = vi.mocked(fracturaView.drawStoryView).mock.calls.at(-1)?.[4];
      if (model && model.choices.length > 0) {
        return;
      }
      press(handler);
    }
    throw new Error("Story never reached its decision page");
  }

  it("commits one reward through the actual scene controls and skips a completed scene on reload", async () => {
    game.override.fracturaStories(true);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const before = loadFracturaProfile().inventory.tonic;
    const { ended, handler } = await openScene(1);
    reachChoices(handler);
    expect(handler.setCursor(0)).toBeDefined();
    press(handler);
    expect(loadFracturaProfile().inventory.tonic).toBe(before + 1);
    expect(loadFracturaStoryState().completedEvents).toContain("chapter-1");

    // A rapid second tap cannot duplicate the choice or its reward.
    expect(handler.processInput(Button.ACTION)).toBe(false);
    expect(loadFracturaProfile().inventory.tonic).toBe(before + 1);
    for (let i = 0; i < 10 && ended.mock.calls.length === 0; i++) {
      press(handler);
    }
    expect(ended).toHaveBeenCalledOnce();

    const replay = new FracturaStoryPhase(1);
    const replayEnded = vi.spyOn(replay, "end").mockImplementation(() => {});
    replay.start();
    expect(replayEnded).toHaveBeenCalledOnce();
    expect(loadFracturaProfile().inventory.tonic).toBe(before + 1);
  });

  it("heals the party and persists the camp decision when the player confirms it", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const player = game.field.getPlayerPokemon();
    player.hp = 1;
    const trust = loadFracturaStoryState().relationship.trust;
    const { handler } = await openScene(20);
    reachChoices(handler);
    handler.setCursor(1);
    press(handler);
    expect(player.hp).toBe(player.getMaxHp());
    const state = loadFracturaStoryState();
    expect(state.flags.campHelped).toBe(true);
    expect(state.relationship.trust).toBeGreaterThan(trust);
    expect(state.completedEvents).toContain("chapter-20");
    expect(game.scene.gameData.saveSystem).toHaveBeenCalled();
  });

  it("shows illustrated Classic routes and grants the chosen camp reward once", async () => {
    game.override.startingWave(10).startingBiome(BiomeId.PLAINS);
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const before = loadFracturaProfile().inventory.tonic;
    const phase = new SelectBiomePhase();
    const ended = vi.spyOn(phase, "end").mockImplementation(() => {});
    phase.start();
    await vi.waitFor(() => expect(game.scene.ui.mode).toBe(UiMode.FRACTURA_ROUTE_MAP));
    const model = vi.mocked(fracturaView.drawRouteView).mock.calls.at(-1)?.[4];
    expect(model?.options).toHaveLength(3);
    const handler = game.scene.ui.getHandler() as FracturaRouteMapUiHandler;
    expect(handler.processInput(Button.ACTION)).toBe(true);
    expect(loadFracturaProfile().inventory.tonic).toBe(before + 1);
    expect(loadFracturaStoryState().route).toEqual({ kind: "camp", nextWave: 11 });
    expect(loadFracturaStoryState().routeHistory.at(-1)?.kind).toBe("camp");
    expect(game.scene.ui.mode).toBe(UiMode.MESSAGE);
    expect(ended).toHaveBeenCalledOnce();
    expect(handler.processInput(Button.ACTION)).toBe(false);
    expect(loadFracturaProfile().inventory.tonic).toBe(before + 1);
  });
});
