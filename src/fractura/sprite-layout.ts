export interface SpriteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  footX: number;
}
export const RIVAL_FRAME = { width: 128, height: 160, footY: 152, bodyHeight: 132 } as const;

/** Locate visible content and its foot anchor before packing transparent atlas cells. */
export function spriteBounds(pixels: Uint8ClampedArray, width: number, height: number): SpriteBounds {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] >= 40) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left) {
    return { x: 0, y: 0, width, height, footX: width / 2 };
  }
  let feet = 0;
  let sum = 0;
  for (let y = Math.max(top, bottom - Math.max(2, Math.floor((bottom - top) * 0.04))); y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (pixels[(y * width + x) * 4 + 3] >= 80) {
        sum += x;
        feet++;
      }
    }
  }
  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
    footX: feet ? sum / feet : (left + right) / 2,
  };
}

/** Generated atlas rows can differ in height; cut inside transparent gutters. */
export function atlasRowCuts(pixels: Uint8ClampedArray, width: number, height: number): number[] {
  const ink = Array.from({ length: height }, (_, y) => {
    let count = 0;
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] >= 40) {
        count++;
      }
    }
    return count;
  });
  const cuts = [0];
  for (let row = 1; row < 4; row++) {
    const expected = (height * row) / 4;
    const from = Math.max(0, Math.floor(expected - height * 0.075));
    const to = Math.min(height - 1, Math.ceil(expected + height * 0.075));
    let best = Math.round(expected);
    let distance = Number.POSITIVE_INFINITY;
    let start = -1;
    for (let y = from; y <= to; y++) {
      if (ink[y] <= 3 && start < 0) {
        start = y;
      }
      if ((ink[y] > 3 || y === to) && start >= 0) {
        if (y - start >= 4) {
          const middle = Math.floor((start + y) / 2);
          if (Math.abs(middle - expected) < distance) {
            best = middle;
            distance = Math.abs(middle - expected);
          }
        }
        start = -1;
      }
    }
    cuts.push(best);
  }
  return [...cuts, height];
}
