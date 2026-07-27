import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CardData } from "./types.js";
import { validateCard } from "./validate-card.js";

export type LoadedCardInput =
  | { kind: "single"; card: CardData }
  | { kind: "batch"; cards: CardData[] };

async function readJson(filePath: string): Promise<unknown> {
  let source: string;
  try {
    source = await readFile(filePath, "utf8");
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read JSON file ${filePath}: ${detail}`);
  }
  try {
    return JSON.parse(source) as unknown;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${filePath}: ${detail}`);
  }
}

export async function loadCard(jsonPath: string, projectRoot: string): Promise<CardData> {
  const absolutePath = path.resolve(projectRoot, jsonPath);
  return validateCard(await readJson(absolutePath), projectRoot);
}

export async function loadCards(jsonPath: string, projectRoot: string): Promise<CardData[]> {
  const absolutePath = path.resolve(projectRoot, jsonPath);
  const value = await readJson(absolutePath);
  if (typeof value !== "object" || value === null || !("cards" in value) || !Array.isArray(value.cards)) {
    throw new Error('Batch JSON must be an object containing a "cards" array');
  }
  return Promise.all(value.cards.map((card) => validateCard(card, projectRoot)));
}

export async function loadCardInput(
  jsonPath: string,
  projectRoot: string,
): Promise<LoadedCardInput> {
  const absolutePath = path.resolve(projectRoot, jsonPath);
  const value = await readJson(absolutePath);
  if (
    typeof value === "object"
    && value !== null
    && "cards" in value
    && Array.isArray(value.cards)
  ) {
    return {
      kind: "batch",
      cards: await Promise.all(
        value.cards.map((card) => validateCard(card, projectRoot)),
      ),
    };
  }
  return {
    kind: "single",
    card: await validateCard(value, projectRoot),
  };
}
