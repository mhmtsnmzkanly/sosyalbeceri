import type { SKRSContext2D } from "@napi-rs/canvas";
import { roundedRectPath } from "../canvas/rounded-rect.js";
import { fitTextToBox } from "../text/fit-text.js";
import { wrapText } from "../text/wrap-text.js";
import type { AnswerKey, CardAnswers, CardData, RenderContext } from "../types.js";

export const ANSWER_KEYS = ["A", "B", "C", "D"] as const;

export interface SharedAnswerFontOptions {
  maxWidth: number;
  maxHeight: number;
  fontFamily: string;
  fontWeight: number;
  initialFontSize: number;
  minimumFontSize: number;
  lineHeight: number;
}

export function calculateSharedAnswerFontSize(
  context: SKRSContext2D,
  answers: CardAnswers,
  options: SharedAnswerFontOptions,
): number {
  let sharedSize = options.initialFontSize;
  for (const key of ANSWER_KEYS) {
    try {
      const fitted = fitTextToBox(context, answers[key], { ...options, alignment: "left" });
      sharedSize = Math.min(sharedSize, fitted.fontSize);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Answer ${key} cannot fit in its box: ${detail}`);
    }
  }
  return sharedSize;
}

export function calculateCardAnswerFontSize(render: RenderContext, card: CardData): number {
  void card;
  return render.resolvedLayout.answerFontSize;
}

function drawAnswer(
  render: RenderContext,
  key: AnswerKey,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
): void {
  const { context, layout, theme } = render;
  roundedRectPath(context, x, y, width, height, layout.answers.radius);
  context.fillStyle = theme.cardBackground;
  context.fill();
  context.strokeStyle = theme.answerBorder;
  context.lineWidth = layout.answers.borderWidth;
  context.stroke();

  const labelX = x + layout.answers.labelLeft + layout.answers.labelDiameter / 2;
  const labelY = y + height / 2;
  context.beginPath();
  context.arc(labelX, labelY, layout.answers.labelDiameter / 2, 0, Math.PI * 2);
  context.fillStyle = theme.primary;
  context.fill();
  context.fillStyle = theme.white;
  context.font = `${layout.typography.answerLabelWeight} ${layout.typography.answerLabelSize}px "${layout.typography.family}"`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(key, labelX, labelY);

  const textX = x + layout.answers.labelLeft + layout.answers.labelDiameter + layout.answers.labelTextGap;
  const textWidth = width - (textX - x) - layout.answers.textRightPadding;
  const wrapped = wrapText(context, text, {
    maxWidth: textWidth,
    fontFamily: layout.typography.family,
    fontWeight: layout.typography.answerWeight,
    fontSize,
  });
  const lineHeightPixels = fontSize * layout.answers.lineHeight;
  const textBlockHeight = wrapped.lines.length * lineHeightPixels;
  const textY = Math.max(y + layout.answers.textTopPadding, y + (height - textBlockHeight) / 2);

  context.font = wrapped.font;
  context.fillStyle = theme.text;
  context.textAlign = "left";
  context.textBaseline = "top";
  wrapped.lines.forEach((line, index) => context.fillText(line, textX, textY + index * lineHeightPixels));
}


export function drawAnswers(render: RenderContext, card: CardData): void {
  const { resolvedLayout } = render;
  const { answerRects, answerFontSize } = resolvedLayout;

  ANSWER_KEYS.forEach((key) => {
    const rect = answerRects[key];

    drawAnswer(
      render,
      key,
      card.answers[key],
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      answerFontSize,
    );
  });
}
