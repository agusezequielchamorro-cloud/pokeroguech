import { activeOverrides } from "#app/overrides";
import { allMoves } from "#data/data-lists";
import { Status } from "#data/status-effect";
import { AbilityId } from "#enums/ability-id";
import { BattlerTagType } from "#enums/battler-tag-type";
import { BiomeId } from "#enums/biome-id";
import { Button } from "#enums/buttons";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { StatusEffect } from "#enums/status-effect";
import { UiMode } from "#enums/ui-mode";
import { WeatherType } from "#enums/weather-type";
import { GameManager } from "#test/framework/game-manager";
import type { FracturaRouletteUiHandler } from "#ui/fractura-roulette-ui-handler";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { forgeMoveKind, getForgedMove, hasTeamSynergy } from "../../../src/fractura/combat";
import { createFracturaRun } from "../../../src/fractura/run-state";
import { loadFracturaStoryState, saveFracturaStoryState } from "../../../src/fractura/story";
import * as fracturaView from "../../../src/fractura/view";

describe("Fractura forged moves in native combat", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .enemySpecies(SpeciesId.SNORLAX)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemyMoveset(MoveId.SPLASH)
      .moveset([MoveId.TACKLE, MoveId.PROTECT, MoveId.SPLASH, MoveId.EMBER])
      .ability(AbilityId.BALL_FETCH)
      .startingLevel(50)
      .enemyLevel(100)
      .criticalHits(false);
  });
  async function start(...party: [SpeciesId] | [SpeciesId, SpeciesId] | [SpeciesId, SpeciesId, SpeciesId]) {
    await game.classicMode.startBattle(...party);
    const state = createFracturaRun(game.scene.seed);
    state.forgeShards = 8;
    saveFracturaStoryState(state);
    return game.field.getPlayerPokemon();
  }
  function prepare(
    moveId: MoveId,
    form: "echo" | "focus" | "vital",
    seal: "none" | "paralysis" | "burn" | "poison" = "none",
  ) {
    const state = loadFracturaStoryState();
    state.moveForgings = [{ pokemonId: game.field.getPlayerPokemon().id, moveId, form, seal }];
    saveFracturaStoryState(state);
  }
  it("uses two real attack hits at reduced power without changing the shared Move or another teammate", async () => {
    const player = await start(SpeciesId.CHARIZARD, SpeciesId.PIKACHU);
    const enemy = game.field.getEnemyPokemon();
    const move = allMoves[MoveId.TACKLE];
    const base = move.calculateBattlePower(player, enemy);
    const sharedPower = move.power;
    const sharedAttrs = [...move.attrs];
    prepare(MoveId.TACKLE, "echo");
    expect(move.calculateBattlePower(player, enemy)).toBeCloseTo(base * 0.65);
    expect(getForgedMove(game.scene.getPlayerParty()[1], move)).toBeUndefined();
    const damage = vi.spyOn(enemy, "damageAndUpdate");
    game.move.select(MoveId.TACKLE);
    await game.toNextTurn();
    expect(damage).toHaveBeenCalledTimes(2);
    expect(move.power).toBe(sharedPower);
    expect(move.attrs).toEqual(sharedAttrs);
    expect(player.getMoveset()[0]!.ppUsed).toBe(1);
  });
  it("changes the native critical roll for the selected move", async () => {
    const player = await start(SpeciesId.CHARIZARD);
    const enemy = game.field.getEnemyPokemon();
    vi.spyOn(activeOverrides, "CRITICAL_HIT_OVERRIDE", "get").mockReturnValue(null);
    const roll = vi.spyOn(game.scene, "randBattleSeedInt").mockReturnValue(1);
    enemy.getCriticalHitResult(player, allMoves[MoveId.TACKLE]);
    expect(roll).toHaveBeenLastCalledWith(24);
    prepare(MoveId.TACKLE, "focus");
    enemy.getCriticalHitResult(player, allMoves[MoveId.TACKLE]);
    expect(roll).toHaveBeenLastCalledWith(8);
  });
  it("heals after damage once and respects Heal Block", async () => {
    const player = await start(SpeciesId.CHARIZARD);
    player.hp = 1;
    prepare(MoveId.TACKLE, "vital");
    game.move.select(MoveId.TACKLE);
    await game.toNextTurn();
    expect(player.hp).toBe(1 + Math.max(1, Math.floor(player.getMaxHp() * 0.06)));
    player.addTag(BattlerTagType.HEAL_BLOCK, 5, MoveId.HEAL_BLOCK, player.id);
    const hp = player.hp;
    game.move.select(MoveId.TACKLE);
    await game.toNextTurn();
    expect(player.hp).toBe(hp);
  });
  it("heals with successful Protection, but not with a failed repeated Protection", async () => {
    const player = await start(SpeciesId.CHARIZARD);
    player.hp = 1;
    prepare(MoveId.PROTECT, "vital");
    game.move.select(MoveId.PROTECT);
    await game.toNextTurn();
    expect(player.hp).toBe(1 + Math.max(1, Math.floor(player.getMaxHp() * 0.1)));
    vi.spyOn(player, "randBattleSeedInt").mockImplementation(range => (range === 3 ? 1 : 0));
    const hp = player.hp;
    game.move.select(MoveId.PROTECT);
    await game.toNextTurn();
    expect(player.hp).toBe(hp);
  });
  it.each([
    ["paralysis", StatusEffect.PARALYSIS],
    ["burn", StatusEffect.BURN],
    ["poison", StatusEffect.POISON],
  ] as const)("applies the %s seal through the native status phase", async (seal, effect) => {
    const originalChance = allMoves[MoveId.TACKLE].chance;
    const player = await start(SpeciesId.CHARIZARD);
    prepare(MoveId.TACKLE, "focus", seal);
    vi.spyOn(player, "randBattleSeedInt").mockReturnValue(0);
    game.move.select(MoveId.TACKLE);
    await game.toNextTurn();
    expect(game.field.getEnemyPokemon().status?.effect).toBe(effect);
    expect(allMoves[MoveId.TACKLE].chance).toBe(originalChance);
  });
  it("keeps poison immunity and excludes moves with incompatible native mechanics", async () => {
    game.override.enemySpecies(SpeciesId.MAGNEMITE);
    const player = await start(SpeciesId.CHARIZARD);
    prepare(MoveId.TACKLE, "focus", "poison");
    vi.spyOn(player, "randBattleSeedInt").mockReturnValue(0);
    game.move.select(MoveId.TACKLE);
    await game.toNextTurn();
    expect(game.field.getEnemyPokemon().status).toBeUndefined();
    expect(forgeMoveKind(allMoves[MoveId.SOLAR_BEAM])).toBe("unsupported");
    expect(forgeMoveKind(allMoves[MoveId.SEISMIC_TOSS])).toBe("unsupported");
    expect(forgeMoveKind(allMoves[MoveId.DOUBLE_SLAP])).toBe("unsupported");
  });
  it("does not bypass a native ability that blocks secondary effects", async () => {
    game.override.enemyAbility(AbilityId.SHIELD_DUST);
    const player = await start(SpeciesId.CHARIZARD);
    prepare(MoveId.TACKLE, "focus", "paralysis");
    vi.spyOn(player, "randBattleSeedInt").mockReturnValue(0);
    game.move.select(MoveId.TACKLE);
    await game.toNextTurn();
    expect(game.field.getEnemyPokemon().status).toBeUndefined();
  });
  it("removes a formation when its third conscious member faints and heals through the native turn phase", async () => {
    const player = await start(SpeciesId.BULBASAUR, SpeciesId.ODDISH, SpeciesId.BELLSPROUT);
    player.hp = 1;
    expect(hasTeamSynergy("grass")).toBe(true);
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(player.hp).toBe(1 + Math.max(1, Math.floor(player.getMaxHp() / 64)));
    game.scene.getPlayerParty()[2].hp = 0;
    expect(hasTeamSynergy("grass")).toBe(false);
    const hp = player.hp;
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(player.hp).toBe(hp);
  });
  it("starts five turns of native rain with three conscious Water teammates", async () => {
    game.override.startingBiome(BiomeId.TOWN);
    await start(SpeciesId.SQUIRTLE, SpeciesId.PSYDUCK, SpeciesId.POLIWAG);
    expect(game.scene.arena.weatherType).toBe(WeatherType.RAIN);
    expect(game.scene.arena.weather?.turnsLeft).toBe(5);
    game.move.select(MoveId.SPLASH);
    await game.toNextTurn();
    expect(game.scene.arena.weather?.turnsLeft).toBe(4);
  });
  it("preserves existing native weather instead of replacing it with the Water formation", async () => {
    game.override.weather(WeatherType.SUNNY);
    await start(SpeciesId.SQUIRTLE, SpeciesId.PSYDUCK, SpeciesId.POLIWAG);
    expect(game.scene.arena.weatherType).toBe(WeatherType.SUNNY);
  });
  it("applies Steel reduction to native damage and removes it when the third member faints", async () => {
    const player = await start(SpeciesId.MAGNEMITE, SpeciesId.KLINK, SpeciesId.BELDUM);
    const enemy = game.field.getEnemyPokemon();
    const move = allMoves[MoveId.TACKLE];
    const withFormation = player.getAttackDamage({ source: enemy, move }).damage;
    game.scene.getPlayerParty()[2].hp = 0;
    const withoutFormation = player.getAttackDamage({ source: enemy, move }).damage;
    expect(withFormation).toBe(Math.max(1, Math.floor(withoutFormation * 0.95)));
  });
  it("boosts native damage against poisoned enemies only while the Poison formation is active", async () => {
    const player = await start(SpeciesId.EKANS, SpeciesId.NIDORAN_F, SpeciesId.GRIMER);
    const enemy = game.field.getEnemyPokemon();
    const move = allMoves[MoveId.TACKLE];
    const healthyDamage = enemy.getAttackDamage({ source: player, move }).damage;
    enemy.status = new Status(StatusEffect.POISON);
    const poisonedDamage = enemy.getAttackDamage({ source: player, move }).damage;
    expect(poisonedDamage).toBe(Math.max(1, Math.floor(healthyDamage * 1.2)));
    game.scene.getPlayerParty()[2].hp = 0;
    expect(enemy.getAttackDamage({ source: player, move }).damage).toBe(healthyDamage);
  });
  it("confirms a forging from the phone controls only once and restores it from the session", async () => {
    const player = await start(SpeciesId.CHARIZARD);
    vi.spyOn(fracturaView, "drawCasinoView").mockReturnValue(null);
    vi.spyOn(game.scene.gameData, "saveAll").mockResolvedValue(true);
    await game.scene.ui.setMode(UiMode.FRACTURA_ROULETTE);
    const handler = game.scene.ui.getHandler() as FracturaRouletteUiHandler;
    for (let i = 0; i < 6; i++) {
      handler.processInput(Button.RIGHT);
    }
    handler.processInput(Button.ACTION);
    handler.processInput(Button.ACTION);
    handler.setCursor(1);
    handler.processInput(Button.ACTION);
    handler.setCursor(1);
    handler.processInput(Button.ACTION);
    expect(handler.processInput(Button.ACTION)).toBe(true);
    expect(loadFracturaStoryState().forgeShards).toBe(4);
    expect(handler.processInput(Button.ACTION)).toBe(false);
    expect(loadFracturaStoryState().forgeShards).toBe(4);
    expect(getForgedMove(player, allMoves[MoveId.TACKLE])).toMatchObject({ form: "echo", seal: "paralysis" });
    const session = game.scene.gameData.getSessionSaveData();
    expect(session.fracturaRun?.moveForgings).toHaveLength(1);
    expect(handler.processInput(Button.CANCEL)).toBe(true);
  });
});
