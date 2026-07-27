import type { CardData, RenderContext } from "../types.js";
import { roundedRectPath } from "../canvas/rounded-rect.js";

interface DrawRect { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number }

function calculateImageRect(
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: "contain" | "cover",
): DrawRect {
  if (fit === "contain") {
    const scale = Math.min(width / imageWidth, height / imageHeight);
    const dw = imageWidth * scale;
    const dh = imageHeight * scale;
    return { sx: 0, sy: 0, sw: imageWidth, sh: imageHeight, dx: x + (width - dw) / 2, dy: y + (height - dh) / 2, dw, dh };
  }

  const scale = Math.max(width / imageWidth, height / imageHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  return {
    sx: (imageWidth - sourceWidth) / 2,
    sy: (imageHeight - sourceHeight) / 2,
    sw: sourceWidth,
    sh: sourceHeight,
    dx: x,
    dy: y,
    dw: width,
    dh: height,
  };
}

export function drawMedia(render: RenderContext, card: CardData): void {
  const mediaRect = render.resolvedLayout.mediaRect;
  if (card.media === undefined || render.loadedAssets.media === undefined || mediaRect === undefined) return;

  const { context, layout, theme } = render;
  const image = render.loadedAssets.media;
  const { x, y, width, height } = mediaRect;

  roundedRectPath(context, x, y, width, height, layout.media.radius);
  context.fillStyle = theme.mediaBackground;
  context.fill();

  context.save();
  roundedRectPath(context, x, y, width, height, layout.media.radius);
  context.clip();
  const inset = card.media.fit === "cover" ? 0 : layout.media.innerPadding;
  const rect = calculateImageRect(
    image.width,
    image.height,
    x + inset,
    y + inset,
    width - inset * 2,
    height - inset * 2,
    card.media.fit ?? "contain",
  );
  context.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, rect.dx, rect.dy, rect.dw, rect.dh);
  context.restore();
}
