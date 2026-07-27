import {
  access,
  copyFile,
  constants as fileSystemConstants,
} from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { createInterface } from "node:readline/promises";

const loadedEnvironmentFiles = new Set<string>();

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function askToCreateEnvironment(): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      ".env bulunamadı. Etkileşimsiz ortamda onay alınamıyor; "
      + "önce .env.example dosyasını .env olarak kopyalayın.",
    );
  }

  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = (
      await prompt.question(
        ".env bulunamadı. .env.example kullanılarak oluşturalım mı? (E/h) ",
      )
    ).trim().toLocaleLowerCase("tr-TR");
    return answer === "" || answer === "e" || answer === "evet"
      || answer === "y" || answer === "yes";
  } finally {
    prompt.close();
  }
}

export interface EnsureEnvironmentOptions {
  confirmCreation?: (() => Promise<boolean>) | undefined;
}

export async function ensureEnvironmentFile(
  projectRoot: string,
  options: EnsureEnvironmentOptions = {},
): Promise<void> {
  const environmentPath = path.resolve(projectRoot, ".env");
  if (await fileExists(environmentPath)) return;

  const examplePath = path.resolve(projectRoot, ".env.example");
  if (!(await fileExists(examplePath))) {
    throw new Error(
      `.env ve .env.example bulunamadı: ${projectRoot}`,
    );
  }

  const shouldCreate = await (
    options.confirmCreation ?? askToCreateEnvironment
  )();
  if (!shouldCreate) {
    console.log(".env oluşturulmadı; varsayılan yapılandırma kullanılacak.");
    return;
  }

  try {
    await copyFile(
      examplePath,
      environmentPath,
      fileSystemConstants.COPYFILE_EXCL,
    );
  } catch (error: unknown) {
    if (
      error instanceof Error
      && "code" in error
      && error.code === "EEXIST"
    ) {
      return;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`.env oluşturulamadı: ${detail}`);
  }

  console.log("✓ .env, .env.example dosyasından oluşturuldu");
}

export function loadEnvironment(projectRoot: string): void {
  const environmentPath = path.resolve(projectRoot, ".env");
  if (loadedEnvironmentFiles.has(environmentPath)) return;

  try {
    loadEnvFile(environmentPath);
  } catch (error: unknown) {
    if (
      error instanceof Error
      && "code" in error
      && error.code === "ENOENT"
    ) {
      loadedEnvironmentFiles.add(environmentPath);
      return;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to load environment ${environmentPath}: ${detail}`);
  }

  loadedEnvironmentFiles.add(environmentPath);
}
