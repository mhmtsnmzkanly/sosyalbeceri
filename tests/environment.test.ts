import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ensureEnvironmentFile } from "../src/environment.js";

test("missing .env is created from .env.example after confirmation", async (testContext) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "sosyalbeceri-env-"));
  testContext.after(() => rm(projectRoot, { recursive: true }));
  await writeFile(
    path.join(projectRoot, ".env.example"),
    'THEME_PRIMARY="#1557B0"\n',
  );

  await ensureEnvironmentFile(projectRoot, {
    confirmCreation: async () => true,
  });

  assert.equal(
    await readFile(path.join(projectRoot, ".env"), "utf8"),
    'THEME_PRIMARY="#1557B0"\n',
  );
});

test("declining environment creation leaves .env absent", async (testContext) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "sosyalbeceri-env-"));
  testContext.after(() => rm(projectRoot, { recursive: true }));
  await writeFile(path.join(projectRoot, ".env.example"), "EXAMPLE=true\n");

  await ensureEnvironmentFile(projectRoot, {
    confirmCreation: async () => false,
  });

  await assert.rejects(
    readFile(path.join(projectRoot, ".env"), "utf8"),
    /ENOENT/,
  );
});

test("startup fails clearly when neither environment file exists", async (testContext) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "sosyalbeceri-env-"));
  testContext.after(() => rm(projectRoot, { recursive: true }));
  await assert.rejects(
    ensureEnvironmentFile(projectRoot, {
      confirmCreation: async () => true,
    }),
    /\.env ve \.env\.example bulunamadı/,
  );
});
