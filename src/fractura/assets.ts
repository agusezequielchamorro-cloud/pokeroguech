import arcaneUrl from "./art/arenas-arcane.png";
import naturalUrl from "./art/arenas-natural.png";
import storyUrl from "./art/arenas-story.png";
import environmentsUrl from "./art/environments.png";
import spritesUrl from "./art/rival-sprites.png";
import rivalsUrl from "./art/rivals.png";
import propsUrl from "./art/scene-props.png";
import { RIVALS, type RivalId } from "./run-state";
import { atlasRowCuts, RIVAL_FRAME, spriteBounds } from "./sprite-layout";

export const FRACTURA_ENVIRONMENTS = "fractura-environments";
export const FRACTURA_RIVALS = "fractura-rivals";
export const FRACTURA_PORTRAITS = "fractura-rival-portraits";
export const FRACTURA_SPRITES = "fractura-rival-sprites";
export const FRACTURA_PROPS = "fractura-scene-props";
export const FRACTURA_ARENAS = ["fractura-arenas-natural", "fractura-arenas-arcane", "fractura-arenas-story"] as const;
export function rivalSpriteKey(id: RivalId): string {
  return "fractura-rival-" + id;
}

export function queueFracturaArt(scene: Phaser.Scene): void {
  for (const [key, url] of [
    [FRACTURA_ENVIRONMENTS, environmentsUrl],
    [FRACTURA_RIVALS, rivalsUrl],
    [FRACTURA_ARENAS[0], naturalUrl],
    [FRACTURA_ARENAS[1], arcaneUrl],
    [FRACTURA_ARENAS[2], storyUrl],
    [FRACTURA_SPRITES, spritesUrl],
    [FRACTURA_PROPS, propsUrl],
  ]) {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, url);
    }
  }
}
function transparentCells(source: HTMLImageElement) {
  const width = Math.floor(source.width / 4);
  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = source.height;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return [];
  }
  const cells: ReturnType<typeof spriteBounds>[] = [];
  for (let col = 0; col < 4; col++) {
    ctx.clearRect(0, 0, width, source.height);
    ctx.drawImage(source, col * width, 0, width, source.height, 0, 0, width, source.height);
    const pixels = ctx.getImageData(0, 0, width, source.height).data;
    const cuts = atlasRowCuts(pixels, width, source.height);
    for (let row = 0; row < 4; row++) {
      const top = cuts[row];
      const b = spriteBounds(pixels.subarray(top * width * 4, cuts[row + 1] * width * 4), width, cuts[row + 1] - top);
      cells[row * 4 + col] = { ...b, x: col * width + b.x, y: top + b.y, footX: col * width + b.footX };
    }
  }
  return cells;
}
function createRivalFrames(scene: Phaser.Scene, source: HTMLImageElement): void {
  const cells = transparentCells(source);
  const portraits = scene.textures.exists(FRACTURA_PORTRAITS)
    ? null
    : scene.textures.createCanvas(FRACTURA_PORTRAITS, 512, 128);
  for (const rival of RIVALS) {
    const key = rivalSpriteKey(rival.id);
    const bounds = cells.slice(rival.frame * 4, rival.frame * 4 + 4);
    if (bounds.length !== 4) {
      continue;
    }
    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, RIVAL_FRAME.width * 4, RIVAL_FRAME.height);
      if (!texture) {
        continue;
      }
      const ctx = texture.getContext();
      ctx.imageSmoothingEnabled = false;
      const reach = Math.max(...bounds.flatMap(b => [b.footX - b.x, b.x + b.width - b.footX]));
      const scale = Math.min(RIVAL_FRAME.bodyHeight / Math.max(...bounds.map(b => b.height)), 58 / reach);
      bounds.forEach((b, pose) => {
        const x = pose * RIVAL_FRAME.width + RIVAL_FRAME.width / 2 + (b.x - b.footX) * scale;
        ctx.drawImage(
          source,
          b.x,
          b.y,
          b.width,
          b.height,
          x,
          RIVAL_FRAME.footY - b.height * scale,
          b.width * scale,
          b.height * scale,
        );
        texture.add(String(pose), 0, pose * RIVAL_FRAME.width, 0, RIVAL_FRAME.width, RIVAL_FRAME.height);
      });
      texture.refresh();
      if (!scene.anims.exists(key)) {
        scene.anims.create({
          key,
          frames: [
            { key, frame: 0 },
            { key, frame: 3 },
            { key, frame: 0 },
          ],
          frameRate: 2,
          repeat: 0,
        });
      }
    }
    if (portraits) {
      const b = bounds[0];
      const side = b.height * 0.53;
      portraits
        .getContext()
        .drawImage(source, Math.max(0, b.x + b.width / 2 - side / 2), b.y, side, side, rival.frame * 128, 0, 128, 128);
      portraits.add(String(rival.frame), 0, rival.frame * 128, 0, 128, 128);
    }
  }
  portraits?.refresh();
}
export function ensureFracturaFrames(scene: Phaser.Scene): void {
  for (const key of [FRACTURA_ENVIRONMENTS, FRACTURA_RIVALS, ...FRACTURA_ARENAS, FRACTURA_SPRITES, FRACTURA_PROPS]) {
    if (!scene.textures.exists(key)) {
      continue;
    }
    const texture = scene.textures.get(key);
    const source = texture.getSourceImage() as HTMLImageElement;
    if (!source?.width || !source.height) {
      continue;
    }
    if (key === FRACTURA_PROPS) {
      if (!texture.has("0")) {
        transparentCells(source).forEach((cell, i) =>
          texture.add(String(i), 0, cell.x, cell.y, cell.width, cell.height),
        );
      }
      continue;
    }
    const cols = key === FRACTURA_ENVIRONMENTS || key === FRACTURA_RIVALS ? 2 : 4;
    const w = Math.floor(source.width / cols);
    const h = Math.floor(source.height / cols);
    for (let i = 0; i < cols * cols; i++) {
      if (!texture.has(String(i))) {
        texture.add(String(i), 0, (i % cols) * w, Math.floor(i / cols) * h, w, h);
      }
    }
    if (
      key === FRACTURA_SPRITES
      && (!scene.textures.exists(FRACTURA_PORTRAITS) || RIVALS.some(r => !scene.textures.exists(rivalSpriteKey(r.id))))
    ) {
      createRivalFrames(scene, source);
    }
  }
}
