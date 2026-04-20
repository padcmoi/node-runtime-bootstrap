import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { RuntimeBootstrapService } from "../src/service";

const temporaryDirs: string[] = [];

afterEach(async () => {
  for (const dir of temporaryDirs.splice(0, temporaryDirs.length)) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function createTempInitializersDir() {
  const dir = await mkdtemp(join(tmpdir(), "runtime-bootstrap-service-"));
  temporaryDirs.push(dir);
  return dir;
}

describe("RuntimeBootstrapService", () => {
  it("runs once and everyProcess when master", async () => {
    const initializersDir = await createTempInitializersDir();

    await writeFile(join(initializersDir, "10_counter.cjs"), `module.exports = { once: async (ctx) => { ctx.once += 1; return 'once ok'; }, everyProcess: (ctx) => { ctx.every += 1; return 'every ok'; } };\n`);

    const service = new RuntimeBootstrapService<{ once: number; every: number }>({
      initializersDir,
      fileExtensions: [".cjs"],
      missingDirectoryBehavior: "error",
      isMaster: true,
    });

    const context = { once: 0, every: 0 };
    const result = await service.run(context);

    expect(result.ranOnce).toBe(1);
    expect(result.ranEveryProcess).toBe(1);
    expect(result.onceErrors).toBe(0);
    expect(result.everyProcessErrors).toBe(0);
    expect(context).toEqual({ once: 1, every: 1 });
  });

  it("runs everyProcess only when worker", async () => {
    const initializersDir = await createTempInitializersDir();

    await writeFile(join(initializersDir, "10_counter.cjs"), `module.exports = { once: (ctx) => { ctx.once += 1; }, everyProcess: (ctx) => { ctx.every += 1; } };\n`);

    const service = new RuntimeBootstrapService<{ once: number; every: number }>({
      initializersDir,
      fileExtensions: [".cjs"],
      missingDirectoryBehavior: "error",
      isMaster: false,
    });

    const context = { once: 0, every: 0 };
    const result = await service.run(context);

    expect(result.ranOnce).toBe(0);
    expect(result.ranEveryProcess).toBe(1);
    expect(context).toEqual({ once: 0, every: 1 });
  });

  it("runs once by default when no isMaster option is provided", async () => {
    const initializersDir = await createTempInitializersDir();

    await writeFile(join(initializersDir, "10_counter.cjs"), `module.exports = { once: (ctx) => { ctx.once += 1; }, everyProcess: (ctx) => { ctx.every += 1; } };\n`);

    const service = new RuntimeBootstrapService<{ once: number; every: number }>({
      initializersDir,
      fileExtensions: [".cjs"],
      missingDirectoryBehavior: "error",
    });

    const context = { once: 0, every: 0 };
    await service.run(context);

    expect(context).toEqual({ once: 1, every: 1 });
  });

  it("supports custom master strategy via callback", async () => {
    const initializersDir = await createTempInitializersDir();

    await writeFile(join(initializersDir, "10_counter.cjs"), `module.exports = { once: (ctx) => { ctx.once += 1; }, everyProcess: (ctx) => { ctx.every += 1; } };\n`);

    const service = new RuntimeBootstrapService<{ once: number; every: number }>({
      initializersDir,
      fileExtensions: [".cjs"],
      missingDirectoryBehavior: "error",
      isMaster: () => process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === "0",
    });

    process.env.NODE_APP_INSTANCE = "2";
    const workerContext = { once: 0, every: 0 };
    await service.run(workerContext, true);
    expect(workerContext).toEqual({ once: 0, every: 1 });

    process.env.NODE_APP_INSTANCE = "0";
    const masterContext = { once: 0, every: 0 };
    await service.run(masterContext, true);
    expect(masterContext).toEqual({ once: 1, every: 1 });
  });
});
