import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AssetCache } from "./assets/asset-cache.js";
import { ensureEnvironmentFile } from "./environment.js";
import { loadCardInput, loadCards } from "./load-card.js";
import { renderCard } from "./render-card.js";
import type { CardData } from "./types.js";

interface GarbageCollectingGlobal {
  gc?: () => void;
}

function cardFileName(card: CardData): string {
  const fileName = `${card.id}.png`;
  if (path.basename(fileName) !== fileName) {
    throw new Error(`Card id "${card.id}" cannot be used as an output filename`);
  }
  return fileName;
}

function batchOutputDirectory(
  jsonPath: string,
  projectRoot: string,
): string {
  const extension = path.extname(jsonPath);
  const inputName = path.basename(jsonPath, extension);
  if (inputName.length === 0) {
    throw new Error(`Unable to derive an output directory from ${jsonPath}`);
  }
  return path.resolve(projectRoot, "output", inputName);
}

async function renderAndWrite(
  card: CardData,
  outputDirectory: string,
  projectRoot: string,
  cache: AssetCache,
): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, cardFileName(card));
  const png = await renderCard(card, { projectRoot, assetCache: cache });
  await writeFile(outputPath, png);
  console.log(`✓ ${path.relative(projectRoot, outputPath)} generated`);
}

async function renderBatch(
  jsonPath: string,
  cards: readonly CardData[],
  projectRoot: string,
  cache: AssetCache,
): Promise<void> {
  const outputDirectory = batchOutputDirectory(jsonPath, projectRoot);
  const collectGarbage = (globalThis as GarbageCollectingGlobal).gc;
  if (cards.length > 25 && collectGarbage === undefined) {
    throw new Error(
      "Large batch rendering requires Node.js --expose-gc to release native Canvas memory between cards",
    );
  }
  for (const card of cards) {
    await renderAndWrite(card, outputDirectory, projectRoot, cache);
    collectGarbage?.();
  }
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  await ensureEnvironmentFile(projectRoot);
  const argument = process.argv[2];
  const cache = new AssetCache();
  if (argument === "--all") {
    const jsonPath = "data/claude-cards.json";
    await renderBatch(
      jsonPath,
      await loadCards(jsonPath, projectRoot),
      projectRoot,
      cache,
    );
    return;
  }
  if (argument === undefined) {
    throw new Error("Usage: npm run render -- <card.json>");
  }
  const input = await loadCardInput(argument, projectRoot);
  if (input.kind === "batch") {
    await renderBatch(argument, input.cards, projectRoot, cache);
    return;
  }
  await renderAndWrite(
    input.card,
    path.resolve(projectRoot, "output"),
    projectRoot,
    cache,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
