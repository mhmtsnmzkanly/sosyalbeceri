import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { loadFonts } from "../src/assets/load-fonts.js";
import { STAGE, TYPOGRAPHY } from "../src/layout/constants.js";

const TURKISH_FIXTURE = [
  "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ",
  "abcçdefgğhıijklmnoöprsştuüvyz",
  "Çatışma çözme",
  "İlk temas",
  "Sınır koyma",
  "Söylediğimin sende böyle bir etki bırakmasına üzüldüm.",
  "Sen olsan hangisini seçerdin?",
] as const;

function readPngDimensions(png: Buffer): { width: number; height: number } {
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test("bundled font registers all weights and renders Turkish glyph fixtures", async () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...values: unknown[]) => warnings.push(values.map(String).join(" "));

  try {
    await loadFonts(process.cwd());
    await loadFonts(process.cwd());

    assert.ok(GlobalFonts.has(TYPOGRAPHY.family));
    const family = GlobalFonts.families.find(({ family: name }) => name === TYPOGRAPHY.family);
    assert.ok(family);
    const weights = new Set(family.styles.map(({ weight }) => weight));
    assert.deepEqual([...weights].sort((left, right) => left - right), [400, 500, 600, 700]);

    const canvas = createCanvas(STAGE.width, STAGE.height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, STAGE.width, STAGE.height);
    context.fillStyle = "#111827";
    context.textBaseline = "top";

    TURKISH_FIXTURE.forEach((line, index) => {
      const weight = index < 2 ? TYPOGRAPHY.regularWeight : TYPOGRAPHY.questionWeight;
      context.font = `${weight} 42px "${TYPOGRAPHY.family}"`;
      context.fillText(line, 60, 80 + index * 100);
    });

    const png = await canvas.encode("png");
    assert.ok(png.length > 1_000);
    assert.deepEqual(readPngDimensions(png), STAGE);
    assert.deepEqual(warnings, []);
  } finally {
    console.warn = originalWarn;
  }
});
