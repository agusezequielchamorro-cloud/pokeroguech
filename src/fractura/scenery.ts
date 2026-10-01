import type { BattleScene } from "../battle-scene";
import { ensureFracturaFrames, FRACTURA_ARENAS } from "./assets";
import type { StoryId } from "./run-state";
import { loadFracturaStoryState } from "./story";

export interface SceneryContext {
  biome: number;
  wave?: number;
  story?: StoryId;
  finalBoss?: boolean;
  awakened?: boolean;
  trainerBattle?: boolean;
}

/** Every one of the 35 native biomes has its own illustrated, continuous battlefield. */
export const BIOME_SCENERY: Readonly<Record<number, readonly [number, number]>> = {
  0: [0, 0],
  1: [0, 1],
  2: [0, 2],
  3: [0, 3],
  4: [0, 4],
  5: [0, 5],
  6: [0, 6],
  7: [0, 7],
  8: [0, 8],
  9: [0, 9],
  10: [0, 10],
  11: [0, 11],
  12: [0, 12],
  13: [0, 13],
  14: [0, 14],
  15: [0, 15],
  16: [1, 0],
  17: [1, 1],
  18: [1, 2],
  19: [1, 3],
  20: [1, 4],
  21: [1, 5],
  22: [1, 6],
  23: [1, 7],
  24: [1, 8],
  25: [1, 9],
  26: [1, 10],
  27: [1, 11],
  28: [1, 12],
  29: [1, 13],
  30: [1, 14],
  31: [1, 15],
  40: [2, 0],
  41: [2, 1],
  50: [2, 2],
};

export function sceneryFor(context: SceneryContext): readonly [number, number] {
  if (context.finalBoss) {
    return [2, context.awakened ? 3 : 2];
  }
  if (context.trainerBattle && context.wave === 190) {
    return [2, 7];
  }
  if (context.story && [50, 115, 165].includes(context.wave ?? 0)) {
    return [2, { umbral: 4, invasion: 5, eclipse: 6 }[context.story]];
  }
  return BIOME_SCENERY[context.biome] ?? BIOME_SCENERY[1];
}

export function setSceneryTexture(
  scene: BattleScene,
  target: Phaser.GameObjects.Sprite,
  selection: readonly [number, number],
): boolean {
  const key = FRACTURA_ARENAS[selection[0]];
  if (!key || !scene.textures.exists(key)) {
    return false;
  }
  ensureFracturaFrames(scene);
  target.setTexture(key, `${selection[1]}`).setDisplaySize(320 * 6, 180 * 6);
  // Terrain coloring expects a full texture's UVs; an atlas frame must not use that threshold.
  target.setPipelineData("terrainColorRatio", 0);
  return true;
}

export function applyBattleScenery(
  scene: BattleScene,
  biome = scene.arena.biomeId,
  target = scene.arenaBg,
  contextual = true,
): boolean {
  const battle = scene.currentBattle;
  const selection = sceneryFor({
    biome,
    ...(contextual && scene.gameMode.isClassic && battle
      ? {
          wave: battle.waveIndex,
          story: loadFracturaStoryState().storyId,
          finalBoss: battle.isClassicFinalBoss,
          awakened: battle.isClassicFinalBoss && scene.getEnemyParty().some(p => p.formIndex > 0),
          trainerBattle: !!battle.trainer,
        }
      : {}),
  });
  return setSceneryTexture(scene, target, selection);
}

/** Cinematic locations are still battle scenes: the party and moving characters share their ground. */
export function chapterScenery(wave: number, story: StoryId): readonly [number, number] | undefined {
  if ([20, 55, 75].includes(wave)) {
    return [2, 8];
  }
  if (wave === 8) {
    return [2, 9];
  }
  if (wave === 30) {
    return [2, { umbral: 1, invasion: 5, eclipse: 15 }[story]];
  }
  if (wave === 40) {
    return [2, 11];
  }
  if ([49, 195].includes(wave)) {
    return [2, { umbral: 4, invasion: 5, eclipse: 6 }[story]];
  }
  return undefined;
}
