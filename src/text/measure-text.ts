import type { SKRSContext2D } from "@napi-rs/canvas";

export interface TextBlockMeasurement {
  width: number;
  height: number;
  lineHeightPixels: number;
  lineCount: number;
}

export function measureTextBlock(
  context: SKRSContext2D,
  lines: readonly string[],
  fontSize: number,
  lineHeight: number,
): TextBlockMeasurement {
  const lineHeightPixels = fontSize * lineHeight;
  const width = lines.reduce((maximum, line) => Math.max(maximum, context.measureText(line).width), 0);
  return {
    width,
    height: lines.length * lineHeightPixels,
    lineHeightPixels,
    lineCount: lines.length,
  };
}
