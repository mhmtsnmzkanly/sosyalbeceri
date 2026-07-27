import { access } from "node:fs/promises";
import path from "node:path";
import { GlobalFonts } from "@napi-rs/canvas";
import { getAssetConfig, type FontAssetConfig } from "../asset-config.js";
import { loadEnvironment } from "../environment.js";

let registeredFontSignature: string | undefined;
let activeRegistration:
  | { signature: string; promise: Promise<void> }
  | undefined;

function resolveFontFiles(
  projectRoot: string,
  config: FontAssetConfig,
): readonly { path: string; weight: 400 | 500 | 600 | 700 }[] {
  return config.files.map((font) => ({
    path: path.resolve(projectRoot, font.path),
    weight: font.weight,
  }));
}

async function registerFonts(
  family: string,
  files: readonly { path: string; weight: 400 | 500 | 600 | 700 }[],
): Promise<void> {
  for (const font of files) {
    try {
      if (!GlobalFonts.registerFromPath(font.path, family)) {
        throw new Error("Canvas rejected the font file");
      }
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Unable to register ${family} weight ${font.weight} from ${font.path}: ${detail}`,
      );
    }
  }

  const registeredFamily = GlobalFonts.families.find(
    ({ family: registeredName }) => registeredName === family,
  );
  const registeredWeights = new Set(registeredFamily?.styles.map(({ weight }) => weight) ?? []);
  const missingWeights = files
    .map(({ weight }) => weight)
    .filter((weight) => !registeredWeights.has(weight));
  if (!GlobalFonts.has(family) || missingWeights.length > 0) {
    throw new Error(
      `Font registration incomplete for ${family}; missing weights: ${missingWeights.join(", ") || "family"}`,
    );
  }
}

export async function loadFonts(
  projectRoot: string,
  suppliedConfig?: FontAssetConfig,
): Promise<void> {
  loadEnvironment(projectRoot);
  const config = suppliedConfig ?? getAssetConfig().fonts;
  const files = resolveFontFiles(projectRoot, config);
  const signature = JSON.stringify({
    family: config.family,
    files,
  });

  for (const font of files) {
    try {
      await access(font.path);
    } catch {
      throw new Error(
        `Required ${config.family} weight ${font.weight} font asset does not exist: ${font.path}`,
      );
    }
  }

  if (registeredFontSignature !== undefined) {
    if (registeredFontSignature !== signature) {
      throw new Error(
        `${config.family} cannot be registered after a different font configuration in the same process`,
      );
    }
    return;
  }

  if (activeRegistration !== undefined) {
    if (activeRegistration.signature !== signature) {
      throw new Error(
        `${config.family} registration conflicts with an in-progress font configuration`,
      );
    }
    return activeRegistration.promise;
  }

  const promise = registerFonts(config.family, files);
  activeRegistration = { signature, promise };
  try {
    await promise;
    registeredFontSignature = signature;
  } finally {
    activeRegistration = undefined;
  }
}
