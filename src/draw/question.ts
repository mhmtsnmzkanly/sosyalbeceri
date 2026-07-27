import type { CardData, RenderContext } from "../types.js";
import { fitTextToBox, type FittedText } from "../text/fit-text.js";

function drawFitted(render: RenderContext, fitted: FittedText, x: number, y: number, color: string): void {
  const { context } = render;
  context.font = fitted.font;
  context.fillStyle = color;
  context.textAlign = fitted.alignment;
  context.textBaseline = "top";
  fitted.lines.forEach((line, index) => {
    context.fillText(line, x, y + index * fitted.lineHeightPixels);
  });
}

export function drawQuestion(render: RenderContext, card: CardData): void {
  const { context, layout, theme, resolvedLayout } = render;
  const scenarioRect = resolvedLayout.scenarioRect;
  const questionRect = resolvedLayout.questionTextRect;

  const scenario = fitTextToBox(context, card.scenario, {
    maxWidth: scenarioRect.width,
    maxHeight: scenarioRect.height,
    fontFamily: layout.typography.family,
    fontWeight: layout.typography.scenarioWeight,
    initialFontSize: layout.question.scenarioInitialSize,
    minimumFontSize: layout.question.scenarioMinimumSize,
    lineHeight: layout.question.scenarioLineHeight,
    alignment: layout.question.alignment,
  });
  drawFitted(
    render,
    scenario,
    scenarioRect.x + scenarioRect.width / 2,
    scenarioRect.y,
    theme.text,
  );

  const question = fitTextToBox(context, card.question, {
    maxWidth: questionRect.width,
    maxHeight: questionRect.height,
    fontFamily: layout.typography.family,
    fontWeight: layout.typography.questionWeight,
    initialFontSize: layout.question.questionInitialSize,
    minimumFontSize: layout.question.questionMinimumSize,
    lineHeight: layout.question.questionLineHeight,
    alignment: layout.question.alignment,
  });
  drawFitted(
    render,
    question,
    questionRect.x + questionRect.width / 2,
    questionRect.y,
    theme.primary,
  );

  const divider = resolvedLayout.questionDividerRect;
  const centerX = divider.x + divider.width / 2;
  const centerY = divider.y + divider.height / 2;
  const halfGap = layout.questionDivider.centerGap / 2;

  context.strokeStyle = theme.divider;
  context.lineWidth = layout.questionDivider.strokeWidth;
  context.beginPath();
  context.moveTo(
    centerX - halfGap - layout.questionDivider.lineWidth,
    centerY,
  );
  context.lineTo(centerX - halfGap, centerY);
  context.moveTo(centerX + halfGap, centerY);
  context.lineTo(
    centerX + halfGap + layout.questionDivider.lineWidth,
    centerY,
  );
  context.stroke();
  context.textAlign = "left";
}
