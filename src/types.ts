import type { Canvas, Image, SKRSContext2D } from "@napi-rs/canvas";
import type { LayoutTokens } from "./layout/constants.js";
import type { ResolvedContentLayout } from "./layout/resolve-layout.js";
import type { CardTheme } from "./theme-type.js";

export type AnswerKey = "A" | "B" | "C" | "D";
export type DifficultyLevel = 1 | 2 | 3 | 4;

export interface CardAnswers {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface CardMedia {
  type: "image" | "illustration";
  src: string;
  fit?: "contain" | "cover";
}

export interface CardData {
  id: string;
  category: string;
  scenario: string;
  question: string;
  media?: CardMedia;
  difficulty?: DifficultyLevel;
  answers: CardAnswers;
}

export interface LoadedAssets {
  outerPatternTile: Image;
  innerGeometricPattern: Image;
  difficultySprite: Image;
  paperTexture?: Image | undefined;
  media?: Image | undefined;
}



export interface RenderContext {
  canvas: Canvas;
  context: SKRSContext2D;
  theme: CardTheme;
  layout: LayoutTokens;
  loadedAssets: LoadedAssets;
  resolvedLayout: ResolvedContentLayout;
}
