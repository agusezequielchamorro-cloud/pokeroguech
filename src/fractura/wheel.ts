/** Pointer angles use wheel-local coordinates, so touch input works at any canvas scale. */
export function wheelSector(x: number, y: number): number {
  return Math.floor(((((Math.atan2(y, x) + Math.PI / 2) * 180) / Math.PI + 360) % 360) / 36);
}

export function angleDelta(previous: number, current: number): number {
  return ((current - previous + 540) % 360) - 180;
}

/** The paid result is independent of the gesture. Strength changes only the number of visible turns. */
export function rouletteStopAngle(from: number, prize: number, turns = 5): number {
  const target = (((-(prize + 0.5) * 36) % 360) + 360) % 360;
  const normalized = ((from % 360) + 360) % 360;
  return from + ((target - normalized + 360) % 360) + turns * 360;
}
