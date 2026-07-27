import type { CardData, RenderContext } from "../types.js";

export function drawBackground(render: RenderContext, card: CardData): void {
  void card;
  const { context, layout, loadedAssets, theme } = render;
  context.fillStyle = theme.canvasBackground;
  context.fillRect(0, 0, layout.stage.width, layout.stage.height);

  const pattern = context.createPattern(loadedAssets.outerPatternTile, "repeat");
  if (pattern === null) throw new Error("Unable to create the repeating background pattern");

  context.save();
  context.globalAlpha = layout.pattern.outerOpacity;
  context.fillStyle = pattern;
  context.fillRect(0, 0, layout.stage.width, layout.stage.height);
  context.restore();
}
