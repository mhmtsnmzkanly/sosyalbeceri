import type { SKRSContext2D } from "@napi-rs/canvas";

export interface WrapTextOptions {
  maxWidth: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
}

export interface WrappedText {
  lines: string[];
  font: string;
}

export function createFontString(fontWeight: number, fontSize: number, fontFamily: string): string {
  return `${fontWeight} ${fontSize}px "${fontFamily}"`;
}

function splitLongToken(context: SKRSContext2D, token: string, maxWidth: number): string[] {
  const parts: string[] = [];
  let current = "";
  for (const character of token) {
    const next = current + character;
    if (current.length > 0 && context.measureText(next).width > maxWidth) {
      parts.push(current);
      current = character;
    } else {
      current = next;
    }
  }
  if (current.length > 0) parts.push(current);
  return parts;
}

export function wrapText(context: SKRSContext2D, text: string, options: WrapTextOptions): WrappedText {
  const font = createFontString(options.fontWeight, options.fontSize, options.fontFamily);
  context.font = font;
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    const rawTokens = paragraph.trim().length === 0 ? [] : paragraph.trim().split(/\s+/u);
    const tokens = rawTokens.flatMap((token) =>
      context.measureText(token).width > options.maxWidth
        ? splitLongToken(context, token, options.maxWidth)
        : [token],
    );
    let current = "";
    for (const token of tokens) {
      const candidate = current.length === 0 ? token : `${current} ${token}`;
      if (current.length > 0 && context.measureText(candidate).width > options.maxWidth) {
        lines.push(current);
        current = token;
      } else {
        current = candidate;
      }
    }
    if (current.length > 0) lines.push(current);
    else if (paragraph.length === 0) lines.push("");
  }

  return { lines, font };
}
