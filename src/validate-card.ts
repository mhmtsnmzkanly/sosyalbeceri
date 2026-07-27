import { access } from "node:fs/promises";
import path from "node:path";
import type {
  CardAnswers,
  CardData,
  CardMedia,
  DifficultyLevel,
} from "./types.js";

const ANSWER_KEYS = ["A", "B", "C", "D"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string`);
  }
  return value;
}

function validateAnswers(value: unknown): CardAnswers {
  if (!isRecord(value)) throw new Error("answers must be an object with keys A, B, C, and D");
  for (const key of ANSWER_KEYS) {
    if (!(key in value)) {
      throw new Error("answers must contain the keys A, B, C, and D");
    }
  }
  return {
    A: requiredString(value, "A"),
    B: requiredString(value, "B"),
    C: requiredString(value, "C"),
    D: requiredString(value, "D"),
  };
}

function validateDifficulty(value: unknown): DifficultyLevel | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "number"
    || !Number.isInteger(value)
    || value < 1
    || value > 4
  ) {
    throw new Error("difficulty must be an integer from 1 to 4");
  }
  return value as DifficultyLevel;
}

async function validateMedia(value: unknown, projectRoot: string): Promise<CardMedia | undefined> {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("media must be an object");
  if (value.type !== "image" && value.type !== "illustration") {
    throw new Error('media.type must be "image" or "illustration"');
  }
  const src = requiredString(value, "src");
  if (value.fit !== undefined && value.fit !== "contain" && value.fit !== "cover") {
    throw new Error('media.fit must be "contain" or "cover"');
  }
  const absolutePath = path.resolve(projectRoot, src);
  try {
    await access(absolutePath);
  } catch {
    throw new Error(`media.src does not exist: ${src}`);
  }
  return value.fit === undefined ? { type: value.type, src } : { type: value.type, src, fit: value.fit };
}

export async function validateCard(value: unknown, projectRoot: string): Promise<CardData> {
  if (!isRecord(value)) throw new Error("Card JSON must contain an object");
  const id = requiredString(value, "id");
  if (id.includes("/") || id.includes("\\")) throw new Error("id must not contain path separators");
  const media = await validateMedia(value.media, projectRoot);
  const difficulty = validateDifficulty(value.difficulty);
  const card: CardData = {
    id,
    category: requiredString(value, "category"),
    scenario: requiredString(value, "scenario"),
    question: requiredString(value, "question"),
    answers: validateAnswers(value.answers),
  };
  if (media !== undefined) card.media = media;
  if (difficulty !== undefined) card.difficulty = difficulty;
  return card;
}
