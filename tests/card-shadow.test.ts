import assert from "node:assert/strict";
import test from "node:test";
import { AssetCache } from "../src/assets/asset-cache.js";
import { createRenderContext } from "../src/canvas/create-canvas.js";
import { drawAnswers } from "../src/draw/answers.js";
import { drawCardShell } from "../src/draw/card-shell.js";
import { LAYOUT, STAGE } from "../src/layout/constants.js";
import { loadCard } from "../src/load-card.js";
import { renderCard } from "../src/render-card.js";
import { getTheme } from "../src/theme-type.js";

const projectRoot = process.cwd();

function readPngDimensions(png: Buffer): { width: number; height: number } {
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

test("main-card shadow configuration is centralized", () => {
  assert.equal(getTheme({}).shadow, "rgba(22, 55, 94, 0.14)");
  assert.equal(LAYOUT.card.shadowBlur, 34);
  assert.equal(LAYOUT.card.shadowOffsetX, 0);
  assert.equal(LAYOUT.card.shadowOffsetY, 14);
  assert.equal(LAYOUT.card.contactShadowEnabled, false);
});

test("minimum and maximum adaptive shells keep the shadow inside the canvas", () => {
  const x = (STAGE.width - LAYOUT.card.width) / 2;
  const minimumY = (STAGE.height - LAYOUT.card.minHeight) / 2;
  const maximumY = (STAGE.height - LAYOUT.card.maxHeight) / 2;
  const blur = LAYOUT.card.shadowBlur;

  for (const [y, height] of [
    [minimumY, LAYOUT.card.minHeight],
    [maximumY, LAYOUT.card.maxHeight],
  ] as const) {
    assert.ok(x - blur >= 0);
    assert.ok(x + LAYOUT.card.width + blur <= STAGE.width);
    assert.ok(y - blur >= 0);
    assert.ok(
      y + height + LAYOUT.card.shadowOffsetY + blur <= STAGE.height,
    );
  }
});

test("card shell restores Canvas shadow state before answers are drawn", async () => {
  const card = await loadCard(
    "data/stress-tests/01-very-short.json",
    projectRoot,
  );
  const render = await createRenderContext(card, projectRoot, new AssetCache());
  const before = {
    color: render.context.shadowColor,
    blur: render.context.shadowBlur,
    offsetX: render.context.shadowOffsetX,
    offsetY: render.context.shadowOffsetY,
  };

  drawCardShell(render, card);
  assert.deepEqual(
    {
      color: render.context.shadowColor,
      blur: render.context.shadowBlur,
      offsetX: render.context.shadowOffsetX,
      offsetY: render.context.shadowOffsetY,
    },
    before,
  );

  drawAnswers(render, card);
  assert.deepEqual(
    {
      color: render.context.shadowColor,
      blur: render.context.shadowBlur,
      offsetX: render.context.shadowOffsetX,
      offsetY: render.context.shadowOffsetY,
    },
    before,
  );
});

test("shadowed minimum and dense cards remain exact 1080 by 1920 PNGs", async () => {
  const minimumCard = await loadCard(
    "data/stress-tests/01-very-short.json",
    projectRoot,
  );
  const denseCard = await loadCard(
    "data/stress-tests/07-minimum-answer-font.json",
    projectRoot,
  );
  const [minimumPng, densePng] = await Promise.all([
    renderCard(minimumCard, { projectRoot }),
    renderCard(denseCard, { projectRoot }),
  ]);

  assert.deepEqual(readPngDimensions(minimumPng), STAGE);
  assert.deepEqual(readPngDimensions(densePng), STAGE);
});
