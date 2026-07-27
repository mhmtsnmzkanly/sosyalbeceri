import type { SKRSContext2D } from "@napi-rs/canvas";
import { measureTextBlock, type TextBlockMeasurement } from "./measure-text.js";
import { wrapText } from "./wrap-text.js";

export interface FitTextOptions {
  maxWidth: number;
  maxHeight: number;
  fontFamily: string;
  fontWeight: number;
  initialFontSize: number;
  minimumFontSize: number;
  lineHeight: number;
  alignment: CanvasTextAlign;
}

export interface FittedText extends TextBlockMeasurement {
  lines: string[];
  font: string;
  fontSize: number;
  alignment: CanvasTextAlign;
}

export function fitTextToBox(context: SKRSContext2D, text: string, options: FitTextOptions): FittedText {
  if (options.minimumFontSize > options.initialFontSize) {
    throw new Error("minimumFontSize cannot exceed initialFontSize");
  }

  for (let fontSize = options.initialFontSize; fontSize >= options.minimumFontSize; fontSize -= 1) {
    const wrapped = wrapText(context, text, {
      maxWidth: options.maxWidth,
      fontFamily: options.fontFamily,
      fontWeight: options.fontWeight,
      fontSize,
    });
    const measurement = measureTextBlock(context, wrapped.lines, fontSize, options.lineHeight);
    if (measurement.width <= options.maxWidth && measurement.height <= options.maxHeight) {
      return { ...measurement, lines: wrapped.lines, font: wrapped.font, fontSize, alignment: options.alignment };
    }
  }

  throw new Error(
    `Text does not fit within ${options.maxWidth}×${options.maxHeight}px at minimum font size ${options.minimumFontSize}px: ${text}`,
  );
}
