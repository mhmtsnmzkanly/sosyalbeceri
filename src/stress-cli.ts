import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AssetCache } from "./assets/asset-cache.js";
import { createRenderContext } from "./canvas/create-canvas.js";
import { calculateCardAnswerFontSize } from "./draw/answers.js";
import { ensureEnvironmentFile } from "./environment.js";
import { loadCard } from "./load-card.js";
import { renderCard } from "./render-card.js";

interface PngDimensions {
  width: number;
  height: number;
}

function readPngDimensions(png: Buffer): PngDimensions {
  const pngSignature = "89504e470d0a1a0a";
  if (png.length < 24 || png.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error("Renderer returned data that is not a valid PNG header");
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  await ensureEnvironmentFile(projectRoot);
  const inputDirectory = path.resolve(projectRoot, "data", "stress-tests");
  const outputDirectory = path.resolve(projectRoot, "output", "stress-tests");
  const entries = await readdir(inputDirectory, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".json")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "tr"));
  if (jsonFiles.length === 0) throw new Error(`No stress-test JSON files found in ${inputDirectory}`);

  await mkdir(outputDirectory, { recursive: true });
  const cache = new AssetCache();
  const failures: string[] = [];

  for (const fileName of jsonFiles) {
    try {
      const relativeInputPath = path.join("data", "stress-tests", fileName);
      const card = await loadCard(relativeInputPath, projectRoot);
      const measurementContext = await createRenderContext(card, projectRoot, cache);
      const answerFontSize = calculateCardAnswerFontSize(measurementContext, card);
      const png = await renderCard(card, { projectRoot, assetCache: cache });
      const dimensions = readPngDimensions(png);
      if (dimensions.width !== measurementContext.layout.stage.width
        || dimensions.height !== measurementContext.layout.stage.height) {
        throw new Error(
          `Expected ${measurementContext.layout.stage.width}×${measurementContext.layout.stage.height}, got ${dimensions.width}×${dimensions.height}`,
        );
      }

      const outputPath = path.join(outputDirectory, `${card.id}.png`);
      await writeFile(outputPath, png);
      const minimumMarker = answerFontSize === measurementContext.layout.answers.minimumFontSize
        ? " minimum-font-size"
        : "";
      const { cardRect, cardState } = measurementContext.resolvedLayout;
      console.log(
        `✓ ${path.relative(projectRoot, outputPath)} ${dimensions.width}×${dimensions.height} card=${cardRect.height.toFixed(2)}px state=${cardState} answer-font=${answerFontSize}px${minimumMarker}`,
      );
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      const failure = `${fileName}: ${detail}`;
      failures.push(failure);
      console.error(`✗ ${failure}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`${failures.length} stress-test card(s) failed:\n${failures.join("\n")}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
