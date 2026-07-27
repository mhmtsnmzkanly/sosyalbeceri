import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { getAssetConfig } from "../asset-config.js";
import { AssetCache } from "../assets/asset-cache.js";
import { loadFonts } from "../assets/load-fonts.js";
import { loadEnvironment } from "../environment.js";
import { LAYOUT, type LayoutTokens } from "../layout/constants.js";
import { resolveLayout } from "../layout/resolve-layout.js";
import { getTheme } from "../theme-type.js";
import type { CardData, LoadedAssets, RenderContext } from "../types.js";

export async function createRenderContext(
  card: CardData,
  projectRoot: string,
  assetCache: AssetCache,
): Promise<RenderContext> {
  loadEnvironment(projectRoot);
  const assetConfig = getAssetConfig();
  await loadFonts(projectRoot, assetConfig.fonts);
  const layout: LayoutTokens = {
    ...LAYOUT,
    typography: {
      ...LAYOUT.typography,
      family: assetConfig.fonts.family,
    },
  };
  const canvas = createCanvas(layout.stage.width, layout.stage.height);
  const context = canvas.getContext("2d");
  const outerPatternPath = path.resolve(projectRoot, assetConfig.outerPatternPath);
  const outerPatternTile = await assetCache.loadImage(outerPatternPath);
  const innerPatternPath = path.resolve(
    projectRoot,
    assetConfig.innerPatternPath,
  );
  const innerGeometricPattern = await assetCache.loadImage(innerPatternPath);
  const difficultySpritePath = path.resolve(
    projectRoot,
    assetConfig.difficultySpritePath,
  );
  const difficultySprite = await assetCache.loadImage(difficultySpritePath);
  const paperTexturePath = path.resolve(projectRoot, assetConfig.paperTexturePath);
  let paperTexture;
  try {
    paperTexture = await assetCache.loadImage(paperTexturePath);
  } catch {
    // optional texture
  }
  const loadedAssets: LoadedAssets = {
    outerPatternTile,
    innerGeometricPattern,
    difficultySprite,
    paperTexture,
  };

  if (card.media !== undefined) {
    const mediaPath = path.resolve(projectRoot, card.media.src);
    loadedAssets.media = await assetCache.loadImage(mediaPath);
  }


  const resolvedLayout = resolveLayout(
    context,
    card,
    layout,
    loadedAssets.media === undefined
      ? undefined
      : {
          width: loadedAssets.media.width,
          height: loadedAssets.media.height,
        },
  );

  return {
    canvas,
    context,
    theme: getTheme(),
    layout,
    loadedAssets,
    resolvedLayout,
  };
}
