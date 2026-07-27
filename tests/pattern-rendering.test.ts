import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas, type Image } from "@napi-rs/canvas";
import { getAssetConfig } from "../src/asset-config.js";
import { AssetCache } from "../src/assets/asset-cache.js";
import { createRenderContext } from "../src/canvas/create-canvas.js";
import { drawBackground } from "../src/draw/background.js";
import { drawCardShell } from "../src/draw/card-shell.js";
import { LAYOUT, STAGE } from "../src/layout/constants.js";
import { renderCard } from "../src/render-card.js";
import { getTheme } from "../src/theme-type.js";
import type { CardData, RenderContext } from "../src/types.js";

const projectRoot = process.cwd();
const card: CardData = {
  id: "PATTERN-TEST",
  category: "İlk temas",
  scenario: "Kısa bir karşılaşma.",
  question: "Ne söylersin?",
  answers: {
    A: "Merhaba.",
    B: "Nasılsın?",
    C: "Tanıştığımıza sevindim.",
    D: "Görüşmek üzere.",
  },
};

function readPixel(
  render: RenderContext,
  x: number,
  y: number,
): readonly [number, number, number, number] {
  const data = render.context.getImageData(x, y, 1, 1).data;
  return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, data[3] ?? 0];
}

function assertPatternHasNoOpaqueTileBackground(image: Image): void {
  const canvas = createCanvas(image.width * 2, image.height * 2);
  const context = canvas.getContext("2d");
  const pattern = context.createPattern(image, "repeat");
  assert.ok(pattern);
  context.fillStyle = pattern;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let transparentPixels = 0;
  let symbolPixels = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] ?? 0;
    if (alpha === 0) {
      transparentPixels += 1;
      continue;
    }

    symbolPixels += 1;
    if (alpha >= 8) {
      assert.ok((pixels[index + 2] ?? 0) >= (pixels[index + 1] ?? 0));
      assert.ok((pixels[index + 1] ?? 0) >= (pixels[index] ?? 0));
      assert.ok((pixels[index + 2] ?? 0) > (pixels[index] ?? 0));
    }
  }

  assert.ok(transparentPixels > 0);
  assert.ok(symbolPixels > 0);
}

function averageAlphaDifferenceAcrossSeam(image: Image): {
  horizontal: number;
  vertical: number;
} {
  const canvas = createCanvas(image.width * 2, image.height * 2);
  const context = canvas.getContext("2d");
  const pattern = context.createPattern(image, "repeat");
  assert.ok(pattern);
  context.fillStyle = pattern;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

  let horizontalDifference = 0;
  for (let y = 0; y < canvas.height; y += 1) {
    const before = ((y * canvas.width + image.width - 1) * 4) + 3;
    const after = ((y * canvas.width + image.width) * 4) + 3;
    horizontalDifference += Math.abs((pixels[before] ?? 0) - (pixels[after] ?? 0));
  }

  let verticalDifference = 0;
  for (let x = 0; x < canvas.width; x += 1) {
    const before = ((((image.height - 1) * canvas.width) + x) * 4) + 3;
    const after = (((image.height * canvas.width) + x) * 4) + 3;
    verticalDifference += Math.abs((pixels[before] ?? 0) - (pixels[after] ?? 0));
  }

  return {
    horizontal: horizontalDifference / canvas.height,
    vertical: verticalDifference / canvas.width,
  };
}

test("pattern assets and opacity are centralized", async () => {
  assert.equal(LAYOUT.pattern.outerOpacity, 0.22);
  assert.equal(LAYOUT.pattern.innerGeometricOpacity, 0.054);
  assert.equal(LAYOUT.pattern.paperTextureOpacity, 0.45);
  const assetConfig = getAssetConfig();
  assert.match(assetConfig.outerPatternPath, /^assets\/patterns\//);
  assert.match(assetConfig.innerPatternPath, /^assets\/patterns\//);

  const render = await createRenderContext(card, projectRoot, new AssetCache());
  assert.ok(render.loadedAssets.outerPatternTile.width > 0);
  assert.ok(render.loadedAssets.innerGeometricPattern.width > 0);
  assert.ok(render.loadedAssets.difficultySprite.width > 0);
});

test("transparent pattern tiles introduce no square background or visible seam", async () => {
  const render = await createRenderContext(card, projectRoot, new AssetCache());
  const inner = render.loadedAssets.innerGeometricPattern;
  const outer = render.loadedAssets.outerPatternTile;

  assertPatternHasNoOpaqueTileBackground(inner);
  assertPatternHasNoOpaqueTileBackground(outer);

  const innerSeam = averageAlphaDifferenceAcrossSeam(inner);
  const outerSeam = averageAlphaDifferenceAcrossSeam(outer);
  assert.ok(innerSeam.horizontal < 2);
  assert.ok(innerSeam.vertical < 2);
  assert.equal(outerSeam.horizontal, 0);
  assert.equal(outerSeam.vertical, 0);
});

test("outer pattern stays behind the card and inner pattern is clipped", async () => {
  const render = await createRenderContext(card, projectRoot, new AssetCache());
  const shell = render.resolvedLayout.cardRect;
  drawBackground(render, card);
  const outsideBeforeShell = readPixel(render, 20, 20);
  const cardCenterBeforeShell = readPixel(
    render,
    shell.x + Math.floor(shell.width / 2),
    shell.y + Math.floor(shell.height / 2),
  );

  drawCardShell(render, card);
  assert.deepEqual(readPixel(render, 20, 20), outsideBeforeShell);
  assert.notDeepEqual(
    readPixel(
      render,
      shell.x + Math.floor(shell.width / 2),
      shell.y + Math.floor(shell.height / 2),
    ),
    cardCenterBeforeShell,
  );

  render.context.clearRect(0, 0, STAGE.width, STAGE.height);
  const clippingRender: RenderContext = {
    ...render,
    theme: {
      ...getTheme(),
      cardBackground: "rgba(0, 0, 0, 0)",
      border: "rgba(0, 0, 0, 0)",
      shadow: "rgba(0, 0, 0, 0)",
      contactShadow: "rgba(0, 0, 0, 0)",
    },
    loadedAssets: {
      ...render.loadedAssets,
      paperTexture: undefined,
    },
  };
  drawCardShell(clippingRender, card);

  assert.equal(readPixel(clippingRender, 0, 0)[3], 0);
  assert.equal(readPixel(clippingRender, shell.x, shell.y)[3], 0);

  let patternedPixelsInsideCard = 0;
  const cardPixels = clippingRender.context.getImageData(
    shell.x,
    shell.y,
    shell.width,
    shell.height,
  ).data;
  for (let index = 3; index < cardPixels.length; index += 4) {
    if ((cardPixels[index] ?? 0) > 0) patternedPixelsInsideCard += 1;
  }
  assert.ok(patternedPixelsInsideCard > 0);
});

test("pattern change preserves exact PNG dimensions", async () => {
  const png = await renderCard(card, { projectRoot });
  assert.equal(png.readUInt32BE(16), STAGE.width);
  assert.equal(png.readUInt32BE(20), STAGE.height);
});
