import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { loadRuntimeInitializersFromDirectory } from "../src/load-initializers";

const temporaryDirs: string[] = [];

afterEach(async () => {
  for (const dir of temporaryDirs.splice(0, temporaryDirs.length)) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function createTempInitializersDir() {
  const dir = await mkdtemp(join(tmpdir(), "runtime-bootstrap-"));
  temporaryDirs.push(dir);
  return dir;
}

describe("loadRuntimeInitializersFromDirectory", () => {
  it("loads valid initializers in sorted order and skips invalid ones", async () => {
    const initializersDir = await createTempInitializersDir();

    await writeFile(join(initializersDir, "20_every.cjs"), `module.exports = { default: { everyProcess: () => 'every' } };\n`);
    await writeFile(join(initializersDir, "10_once.cjs"), `module.exports = { once: () => 'once' };\n`);
    await writeFile(join(initializersDir, "90_invalid.cjs"), `module.exports = { nope: true };\n`);

    await mkdir(join(initializersDir, "nested"));
    await writeFile(join(initializersDir, "nested", "30_nested.cjs"), `module.exports = { everyProcess: () => 'nested' };\n`);

    const result = await loadRuntimeInitializersFromDirectory({
      initializersDir,
      recursive: true,
      fileExtensions: [".cjs"],
    });

    expect(result.loaded).toBe(3);
    expect(result.skipped).toBe(1);
    expect(result.modules.map((item) => item.initializerId)).toEqual(["10_once", "20_every", "nested/30_nested"]);
  });

  it("returns zero when directory does not exist", async () => {
    const result = await loadRuntimeInitializersFromDirectory({
      initializersDir: "/tmp/runtime-initializers-that-do-not-exist",
      missingDirectoryBehavior: "ignore",
    });

    expect(result).toEqual({ loaded: 0, skipped: 0, files: [], modules: [] });
  });

  it("throws when missingDirectoryBehavior is error", async () => {
    await expect(
      loadRuntimeInitializersFromDirectory({
        initializersDir: "/tmp/runtime-initializers-that-do-not-exist",
        missingDirectoryBehavior: "error",
      }),
    ).rejects.toThrow(/initializers directory not found/i);
  });
});
