import environmentsUrl from "./art/environments.png";
import rivalsUrl from "./art/rivals.png";

export const FRACTURA_ENVIRONMENTS = "fractura-environments";
export const FRACTURA_RIVALS = "fractura-rivals";

export function queueFracturaArt(scene: Phaser.Scene): void {
  if (!scene.textures.exists(FRACTURA_ENVIRONMENTS)) {
    scene.load.image(FRACTURA_ENVIRONMENTS, environmentsUrl);
  }
  if (!scene.textures.exists(FRACTURA_RIVALS)) {
    scene.load.image(FRACTURA_RIVALS, rivalsUrl);
  }
}

/** Frame coordinates come from the actual atlas size, including generated images of different resolutions. */
export function ensureFracturaFrames(scene: Phaser.Scene): void {
  for (const key of [FRACTURA_ENVIRONMENTS, FRACTURA_RIVALS]) {
    if (!scene.textures.exists(key)) {
      continue;
    }
    const texture = scene.textures.get(key);
    const source = texture.getSourceImage() as HTMLImageElement;
    const w = Math.floor(source.width / 2);
    const h = Math.floor(source.height / 2);
    for (let i = 0; i < 4; i++) {
      if (!texture.has(`${i}`)) {
        texture.add(`${i}`, 0, (i % 2) * w, Math.floor(i / 2) * h, w, h);
      }
    }
  }
}
