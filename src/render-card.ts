import { AssetCache } from "./assets/asset-cache.js";
import { createRenderContext } from "./canvas/create-canvas.js";
import { drawAnswers } from "./draw/answers.js";
import { drawBackground } from "./draw/background.js";
import { drawCardShell } from "./draw/card-shell.js";
import { drawHeader } from "./draw/header.js";
import { drawMedia } from "./draw/media.js";
import { drawQuestion } from "./draw/question.js";
import type { CardData } from "./types.js";

export interface RenderCardOptions {
  projectRoot?: string;
  assetCache?: AssetCache;
}

const sharedAssetCache = new AssetCache();

export async function renderCard(card: CardData, options: RenderCardOptions = {}): Promise<Buffer> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const assetCache = options.assetCache ?? sharedAssetCache;
  const renderContext = await createRenderContext(card, projectRoot, assetCache);

  await drawBackground(renderContext, card);
  await drawCardShell(renderContext, card);
  await drawHeader(renderContext, card);
  await drawQuestion(renderContext, card);
  if (card.media !== undefined) {
    await drawMedia(renderContext, card);
  }
  await drawAnswers(renderContext, card);

  return renderContext.canvas.encode("png");
}
