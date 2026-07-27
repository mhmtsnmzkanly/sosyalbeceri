import type { CardData, RenderContext } from "../types.js";
import { roundedRectPath } from "../canvas/rounded-rect.js";

function drawShadowShape(
  render: RenderContext,
  color: string,
  blur: number,
  offsetX: number,
  offsetY: number,
): void {
  const { context, resolvedLayout, theme } = render;
  const shell = resolvedLayout.cardRect;
  const cardStyle = render.layout.card;

  context.save();
  context.shadowColor = color;
  context.shadowBlur = blur;
  context.shadowOffsetX = offsetX;
  context.shadowOffsetY = offsetY;
  roundedRectPath(
    context,
    shell.x,
    shell.y,
    shell.width,
    shell.height,
    cardStyle.radius,
  );
  context.fillStyle = theme.cardBackground;
  context.fill();
  context.restore();
}

export function drawCardShell(render: RenderContext, card: CardData): void {
  void card;
  const { context, layout, loadedAssets, resolvedLayout, theme } = render;
  const shell = resolvedLayout.cardRect;
  const cardStyle = layout.card;

  drawShadowShape(
    render,
    theme.shadow,
    cardStyle.shadowBlur,
    cardStyle.shadowOffsetX,
    cardStyle.shadowOffsetY,
  );
  if (cardStyle.contactShadowEnabled) {
    drawShadowShape(
      render,
      theme.contactShadow,
      cardStyle.contactShadowBlur,
      cardStyle.contactShadowOffsetX,
      cardStyle.contactShadowOffsetY,
    );
  }

  roundedRectPath(context, shell.x, shell.y, shell.width, shell.height, cardStyle.radius);
  context.fillStyle = theme.cardBackground;
  context.fill();

  if (loadedAssets.paperTexture !== undefined) {
    context.save();
    roundedRectPath(context, shell.x, shell.y, shell.width, shell.height, cardStyle.radius);
    context.clip();
    const pattern = context.createPattern(loadedAssets.paperTexture, "repeat");
    if (pattern !== null) {
      context.globalAlpha = layout.pattern.paperTextureOpacity;
      context.fillStyle = pattern;
      context.fillRect(shell.x, shell.y, shell.width, shell.height);
    }
    context.restore();
  }

  context.save();
  roundedRectPath(context, shell.x, shell.y, shell.width, shell.height, cardStyle.radius);
  context.clip();
  const innerPattern = context.createPattern(loadedAssets.innerGeometricPattern, "repeat");
  if (innerPattern === null) {
    context.restore();
    throw new Error("Unable to create the repeating inner card pattern");
  }
  context.globalAlpha = layout.pattern.innerGeometricOpacity;
  context.fillStyle = innerPattern;
  context.fillRect(shell.x, shell.y, shell.width, shell.height);
  context.restore();

  roundedRectPath(context, shell.x, shell.y, shell.width, shell.height, cardStyle.radius);
  context.strokeStyle = theme.border;
  context.lineWidth = cardStyle.borderWidth;
  context.stroke();
}
