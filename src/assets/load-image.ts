import { access } from "node:fs/promises";
import { loadImage, type Image } from "@napi-rs/canvas";

export async function loadImageFile(absolutePath: string): Promise<Image> {
  try {
    await access(absolutePath);
  } catch {
    throw new Error(`Image asset does not exist: ${absolutePath}`);
  }

  try {
    return await loadImage(absolutePath);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to load image asset ${absolutePath}: ${detail}`);
  }
}
