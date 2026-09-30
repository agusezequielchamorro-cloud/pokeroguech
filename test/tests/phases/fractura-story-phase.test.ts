import { AbilityId } from "#enums/ability-id";
import { BiomeId } from "#enums/biome-id";
import { Button } from "#enums/buttons";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import { UiMode } from "#enums/ui-mode";
import { VoucherType } from "#enums/voucher-type";
import { Trainer } from "#field/trainer";
import { FracturaStoryPhase } from "#phases/fractura-story-phase";
import { SelectBiomePhase } from "#phases/select-biome-phase";
import { GameManager } from "#test/framework/game-manager";
import type { FracturaRouletteUiHandler } from "#ui/fractura-roulette-ui-handler";
import type { FracturaRouteMapUiHandler } from "#ui/fractura-route-map-ui-handler";
import type { FracturaStoryUiHandler } from "#ui/fractura-story-ui-handler";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadFracturaProfile } from "../../../src/fractura/profile";
import { RIVALS } from "../../../src/fractura/run-state";
import { getFracturaStoryEvent, loadFracturaStoryState, saveFracturaStoryState } from "../../../src/fractura/story";
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
    for (let i = 0; i < 40; i++) {
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
    for (let i = 0; i < 40 && ended.mock.calls.length === 0; i++) {
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

  it("treats conscious injuries once, without reviving a fainted teammate", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP, SpeciesId.FEEBAS);
    const [player, fainted] = game.scene.getPlayerParty();
    player.hp = 1;
    fainted.hp = 0;
    expect(getFracturaStoryEvent(4)?.id).toBe("ambient-4-aid");
    const { handler, ended } = await openScene(4);
    reachChoices(handler);
    handler.setCursor(0);
    press(handler);
    const healed = Math.min(player.getMaxHp(), 1 + Math.max(1, Math.floor(player.getMaxHp() * 0.2)));
    expect(player.hp).toBe(healed);
    expect(fainted.hp).toBe(0);
    const state = loadFracturaStoryState();
    expect(state.completedEvents).toContain("ambient-4-aid");
    expect(state.lastAmbientWave).toBe(4);
    expect(getFracturaStoryEvent(4)).toBeUndefined();
    expect(getFracturaStoryEvent(5)).toBeUndefined();
    expect(handler.processInput(Button.ACTION)).toBe(false);
    expect(player.hp).toBe(healed);
    for (let i = 0; i < 40 && ended.mock.calls.length === 0; i++) {
      press(handler);
    }
    expect(ended).toHaveBeenCalledOnce();
    expect(game.scene.ui.mode).toBe(UiMode.MESSAGE);
  });

  it.each(RIVALS)("uses $name's actual field sprite for every rival battle", async rival => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    const state = loadFracturaStoryState();
    state.rivalId = rival.id;
    saveFracturaStoryState(state);
    const key = `fractura-rival-${rival.id}`;
    vi.spyOn(game.scene.textures, "exists").mockImplementation(texture => texture === key);
    const originalAdd = game.scene.addFieldSprite.bind(game.scene);
    vi.spyOn(game.scene, "addFieldSprite").mockImplementation((...args) => {
      const sprite = originalAdd(...args);
      sprite.setDisplaySize = vi.fn().mockReturnValue(sprite);
      return sprite;
    });
    for (const type of [
      TrainerType.RIVAL,
      TrainerType.RIVAL_2,
      TrainerType.RIVAL_3,
      TrainerType.RIVAL_4,
      TrainerType.RIVAL_5,
      TrainerType.RIVAL_6,
    ]) {
      const trainer = new Trainer(type, TrainerVariant.DEFAULT);
      expect(trainer.hasFracturaSprite()).toBe(true);
      expect(trainer.getKey()).toBe(key);
      expect(trainer.getSprites().every(sprite => sprite.texture.key === key)).toBe(true);
      await expect(trainer.loadAssets()).resolves.toBeUndefined();
    }
  });

  it("inspects a roulette sector without spending and commits a paid spin once", async () => {
    await game.classicMode.startBattle(SpeciesId.MAGIKARP);
    game.scene.gameData.voucherCounts[VoucherType.REGULAR] = 2;
    const saved = vi.spyOn(game.scene.gameData, "saveAll").mockResolvedValue(true);
    const wheel = {
      setAngle: vi.fn(),
      getWorldTransformMatrix: () => ({ applyInverse: (x: number, y: number) => ({ x: x - 55, y: y - 91 }) }),
    } as unknown as Phaser.GameObjects.Container;
    vi.spyOn(fracturaView, "drawCasinoView").mockReturnValue(wheel);
    await game.scene.ui.setMode(UiMode.FRACTURA_ROULETTE);
    await vi.waitFor(() => expect(game.scene.ui.mode).toBe(UiMode.FRACTURA_ROULETTE));
    const model = vi.mocked(fracturaView.drawCasinoView).mock.calls.at(-1)!;
    model[1].getWorldTransformMatrix = vi.fn().mockReturnValue({
      applyInverse: (x: number, y: number) => ({ x, y }),
    });
    const pointer = { id: 4, x: 85, y: 91 } as Phaser.Input.Pointer;
    model[4].onWheelDown?.(pointer);
    game.scene.input.emit("pointerup", pointer);
    expect(vi.mocked(fracturaView.drawCasinoView).mock.calls.at(-1)?.[4].selected).toBe(2);
    expect(game.scene.gameData.voucherCounts[VoucherType.REGULAR]).toBe(2);
    vi.spyOn(game.scene.tweens, "add").mockReturnValue({ remove: vi.fn() } as unknown as Phaser.Tweens.Tween);
    const handler = game.scene.ui.getHandler() as FracturaRouletteUiHandler;
    expect(handler.processInput(Button.ACTION)).toBe(true);
    expect(game.scene.gameData.voucherCounts[VoucherType.REGULAR]).toBe(1);
    expect(handler.processInput(Button.ACTION)).toBe(false);
    expect(game.scene.gameData.voucherCounts[VoucherType.REGULAR]).toBe(1);
    expect(saved).toHaveBeenCalled();
    handler.clear();
    expect(game.scene.gameData.voucherCounts[VoucherType.REGULAR]).toBe(1);
  });
});
