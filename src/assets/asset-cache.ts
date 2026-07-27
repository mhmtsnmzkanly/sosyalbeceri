import type { Image } from "@napi-rs/canvas";
import { loadImageFile } from "./load-image.js";

export class AssetCache {
  private readonly images = new Map<string, Promise<Image>>();

  public loadImage(absolutePath: string): Promise<Image> {
    const cached = this.images.get(absolutePath);
    if (cached !== undefined) return cached;

    const pending = loadImageFile(absolutePath).catch((error: unknown) => {
      this.images.delete(absolutePath);
      throw error;
    });
    this.images.set(absolutePath, pending);
    return pending;
  }
}
