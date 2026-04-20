import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, relative, resolve } from "node:path";
import type { RuntimeLoadOptions, RuntimeModule } from "./types";

const DEFAULT_EXTENSIONS = [".js", ".cjs", ".ts", ".cts"];

function toRuntimeResult(value: unknown) {
  if (typeof value === "string") return value;
  return undefined;
}

function normalizeExtensions(fileExtensions: string[] | undefined) {
  const source = fileExtensions && fileExtensions.length > 0 ? fileExtensions : DEFAULT_EXTENSIONS;
  return source.map((item) => (item.startsWith(".") ? item.toLowerCase() : `.${item.toLowerCase()}`));
}

function toInitializerId(initializersDir: string, filePath: string, extensions: string[]) {
  const rel = relative(initializersDir, filePath).split("\\").join("/");

  for (const extension of extensions) {
    if (rel.toLowerCase().endsWith(extension)) {
      return rel.slice(0, rel.length - extension.length);
    }
  }

  return rel;
}

async function listInitializerFiles(baseDir: string, recursive: boolean, extensions: string[]) {
  const out: string[] = [];

  const walk = async (dir: string) => {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (recursive) await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (entry.name.endsWith(".d.ts")) continue;

      const extension = extname(entry.name).toLowerCase();
      if (!extensions.includes(extension)) continue;

      out.push(fullPath);
    }
  };

  await walk(baseDir);

  return out.sort();
}

function extractRuntimeModule<TContext>(value: unknown) {
  if (typeof value !== "object" || value === null) return null;

  const hasOnce = "once" in value;
  const hasEveryProcess = "everyProcess" in value;

  if (!hasOnce && !hasEveryProcess) return null;

  const onceImpl = hasOnce ? value.once : undefined;
  const everyProcessImpl = hasEveryProcess ? value.everyProcess : undefined;

  if (onceImpl !== undefined && typeof onceImpl !== "function") return null;
  if (everyProcessImpl !== undefined && typeof everyProcessImpl !== "function") return null;

  return {
    ...(typeof onceImpl === "function"
      ? {
          once: async (context: TContext) => {
            const result = Reflect.apply(onceImpl, value, [context]) as unknown;
            const awaited = await Promise.resolve<unknown>(result);
            return toRuntimeResult(awaited);
          },
        }
      : {}),
    ...(typeof everyProcessImpl === "function"
      ? {
          everyProcess: async (context: TContext) => {
            const result = Reflect.apply(everyProcessImpl, value, [context]) as unknown;
            const awaited = await Promise.resolve<unknown>(result);
            return toRuntimeResult(awaited);
          },
        }
      : {}),
  } satisfies RuntimeModule<TContext>;
}

function pickRuntimeModule<TContext>(imported: unknown) {
  const direct = extractRuntimeModule<TContext>(imported);
  if (direct) return direct;

  if (typeof imported === "object" && imported !== null && "default" in imported) {
    return extractRuntimeModule<TContext>(imported.default);
  }

  return null;
}

export async function loadRuntimeInitializersFromDirectory<TContext>(options: RuntimeLoadOptions) {
  const logger = options.logger;
  const recursive = options.recursive ?? false;
  const missingDirectoryBehavior = options.missingDirectoryBehavior ?? "warn";
  const extensions = normalizeExtensions(options.fileExtensions);
  const resolvedInitializersDir = resolve(options.initializersDir);
  const loadWithRequire = createRequire(join(resolvedInitializersDir, "__runtime_bootstrap_loader__.cjs"));

  if (!existsSync(resolvedInitializersDir)) {
    const message = `[BOOTSTRAP RUNTIME] initializers directory not found: ${options.initializersDir}`;

    if (missingDirectoryBehavior === "error") {
      throw new Error(message);
    }

    if (missingDirectoryBehavior === "warn") {
      logger?.warn?.(message);
    }

    return { loaded: 0, skipped: 0, files: [], modules: [] };
  }

  const files = await listInitializerFiles(resolvedInitializersDir, recursive, extensions);
  if (files.length === 0) {
    return { loaded: 0, skipped: 0, files: [], modules: [] };
  }

  let loaded = 0;
  let skipped = 0;
  const loadedFiles: string[] = [];
  const loadedModules: { initializerId: string; filePath: string; module: RuntimeModule<TContext> }[] = [];

  for (const filePath of files) {
    let imported: unknown;
    const relativeFile = relative(resolvedInitializersDir, filePath).split("\\").join("/");

    try {
      imported = loadWithRequire(`./${relativeFile}`);
    } catch (error) {
      skipped += 1;
      logger?.warn?.("[BOOTSTRAP RUNTIME] failed to require initializer", { filePath, error });
      continue;
    }

    const runtimeModule = pickRuntimeModule<TContext>(imported);
    if (!runtimeModule) {
      skipped += 1;
      logger?.warn?.("[BOOTSTRAP RUNTIME] skipped invalid initializer module", { filePath });
      continue;
    }

    const initializerId = toInitializerId(resolvedInitializersDir, filePath, extensions);

    loaded += 1;
    loadedFiles.push(filePath);
    loadedModules.push({ initializerId, filePath, module: runtimeModule });
  }

  return { loaded, skipped, files: loadedFiles, modules: loadedModules };
}
