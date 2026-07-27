import { roundedRectPath } from "../canvas/rounded-rect.js";
import type { CardData, RenderContext } from "../types.js";

export function drawHeaderMeta(render: RenderContext, card: CardData): void {
  const { context, layout, loadedAssets, resolvedLayout, theme } = render;
  const {
    difficultyMascotRect,
    categoryBadgeRect,
    categorySeparatorRect,
    cardIdRect,
    categoryFontSize,
  } = resolvedLayout.headerMeta;
  const difficulty = card.difficulty ?? layout.headerMeta.defaultDifficulty;
  const frame = layout.headerMeta.difficultyFrames[difficulty - 1];
  if (frame === undefined) {
    throw new Error(`No fox mascot frame configured for difficulty ${difficulty}`);
  }

  const mascotScale = Math.min(
    layout.headerMeta.mascotVisibleSize / frame.width,
    layout.headerMeta.mascotVisibleSize / frame.height,
  );
  const mascotWidth = frame.width * mascotScale;
  const mascotHeight = frame.height * mascotScale;
  const mascotX = (
    difficultyMascotRect.x
    + (difficultyMascotRect.width - mascotWidth) / 2
  );
  const mascotY = (
    difficultyMascotRect.y
    + (difficultyMascotRect.height - mascotHeight) / 2
  );
  context.drawImage(
    loadedAssets.difficultySprite,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    mascotX,
    mascotY,
    mascotWidth,
    mascotHeight,
  );

  roundedRectPath(
    context,
    categoryBadgeRect.x,
    categoryBadgeRect.y,
    categoryBadgeRect.width,
    categoryBadgeRect.height,
    layout.category.badgeRadius,
  );
  context.fillStyle = theme.primarySoft;
  context.fill();

  const label = card.category.toLocaleUpperCase("tr-TR");
  context.fillStyle = theme.primary;
  context.font = `${layout.typography.categoryWeight} ${categoryFontSize}px "${layout.typography.family}"`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    label,
    categoryBadgeRect.x + categoryBadgeRect.width / 2,
    categoryBadgeRect.y + layout.category.labelHeight / 2,
  );

  context.save();
  context.globalAlpha = layout.headerMeta.separatorOpacity;
  roundedRectPath(
    context,
    categorySeparatorRect.x,
    categorySeparatorRect.y,
    categorySeparatorRect.width,
    categorySeparatorRect.height,
    categorySeparatorRect.height / 2,
  );
  context.fillStyle = theme.border;
  context.fill();
  context.restore();

  context.fillStyle = theme.mutedText;
  context.font = `${layout.headerMeta.cardIdWeight} ${layout.headerMeta.cardIdFontSize}px "${layout.typography.family}"`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    card.id,
    cardIdRect.x + cardIdRect.width / 2,
    cardIdRect.y + cardIdRect.height / 2,
  );
}

export function drawHeader(render: RenderContext, card: CardData): void {
  drawHeaderMeta(render, card);
  render.context.textAlign = "left";
}
