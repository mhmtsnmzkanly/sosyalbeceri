import type { SKRSContext2D } from "@napi-rs/canvas";

export function roundedRectPath(
  context: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}
