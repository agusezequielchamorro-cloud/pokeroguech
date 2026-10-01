import arcaneUrl from "./art/arenas-arcane.png";
import naturalUrl from "./art/arenas-natural.png";
import storyUrl from "./art/arenas-story.png";
import environmentsUrl from "./art/environments.png";
import spritesUrl from "./art/rival-sprites.png";
import rivalsUrl from "./art/rivals.png";
import { RIVALS, type RivalId } from "./run-state";

export const FRACTURA_ENVIRONMENTS = "fractura-environments";
export const FRACTURA_RIVALS = "fractura-rivals";
export const FRACTURA_SPRITES = "fractura-rival-sprites";
export const FRACTURA_ARENAS = ["fractura-arenas-natural", "fractura-arenas-arcane", "fractura-arenas-story"] as const;

export function rivalSpriteKey(id: RivalId): string {
  return `fractura-rival-${id}`;
}

export function queueFracturaArt(scene: Phaser.Scene): void {
  if (!scene.textures.exists(FRACTURA_ENVIRONMENTS)) {
    scene.load.image(FRACTURA_ENVIRONMENTS, environmentsUrl);
  }
  if (!scene.textures.exists(FRACTURA_RIVALS)) {
    scene.load.image(FRACTURA_RIVALS, rivalsUrl);
  }
  for (const [key, url] of [
    [FRACTURA_ARENAS[0], naturalUrl],
    [FRACTURA_ARENAS[1], arcaneUrl],
    [FRACTURA_ARENAS[2], storyUrl],
    [FRACTURA_SPRITES, spritesUrl],
  ]) {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, url);
    }
  }
}

/** Frame coordinates come from the actual atlas size, including generated images of different resolutions. */
export function ensureFracturaFrames(scene: Phaser.Scene): void {
  for (const key of [FRACTURA_ENVIRONMENTS, FRACTURA_RIVALS, ...FRACTURA_ARENAS, FRACTURA_SPRITES]) {
    if (!scene.textures.exists(key)) {
      continue;
    }
    const texture = scene.textures.get(key);
    const source = texture.getSourceImage() as HTMLImageElement;
    if (!source?.width || !source.height) {
      continue;
    }
    const columns = key === FRACTURA_ENVIRONMENTS || key === FRACTURA_RIVALS ? 2 : 4;
    const w = Math.floor(source.width / columns);
    const h = Math.floor(source.height / columns);
    for (let i = 0; i < columns * columns; i++) {
      if (!texture.has(`${i}`)) {
        texture.add(`${i}`, 0, (i % columns) * w, Math.floor(i / columns) * h, w, h);
      }
    }
    if (key === FRACTURA_SPRITES) {
      for (const rival of RIVALS) {
        const rivalKey = rivalSpriteKey(rival.id);
        if (!texture.has(rival.id)) {
          texture.add(rival.id, 0, 0, rival.frame * h, w * 4, h);
        }
        if (!scene.textures.exists(rivalKey)) {
          scene.textures.addSpriteSheetFromAtlas(rivalKey, {
            atlas: key,
            frame: rival.id,
            frameWidth: w,
            frameHeight: h,
          });
        }
        if (!scene.anims.exists(rivalKey)) {
          scene.anims.create({
            key: rivalKey,
            frames: [0, 2, 3, 2, 0].map(frame => ({ key: rivalKey, frame })),
            frameRate: 5,
            repeat: 0,
          });
        }
      }
    }
  }
}
