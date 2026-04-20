import { loadRuntimeInitializersFromDirectory } from "./load-initializers";
import type { LoadedRuntimeModule, RuntimeBootstrapServiceOptions } from "./types";

export class RuntimeBootstrapService<TContext = unknown> {
  private readonly initializersDir: string;
  private readonly recursive: boolean;
  private readonly fileExtensions: string[] | undefined;
  private readonly missingDirectoryBehavior: "warn" | "error" | "ignore";
  private readonly logger: RuntimeBootstrapServiceOptions["logger"];
  private readonly isMasterOption: RuntimeBootstrapServiceOptions["isMaster"];

  private initializersLoaded = false;
  private readonly loadedInitializers: LoadedRuntimeModule<TContext>[] = [];

  constructor(options: RuntimeBootstrapServiceOptions) {
    this.initializersDir = options.initializersDir;
    this.recursive = options.recursive ?? false;
    this.fileExtensions = options.fileExtensions;
    this.missingDirectoryBehavior = options.missingDirectoryBehavior ?? "warn";
    this.logger = options.logger;
    this.isMasterOption = options.isMaster;
  }

  private resolveIsMaster() {
    if (typeof this.isMasterOption === "function") return Boolean(this.isMasterOption());
    if (typeof this.isMasterOption === "boolean") return this.isMasterOption;
    return true;
  }

  listInitializerIds() {
    return this.loadedInitializers.map((entry) => entry.initializerId);
  }

  async loadInitializers(force = false) {
    if (force) {
      this.loadedInitializers.splice(0, this.loadedInitializers.length);
      this.initializersLoaded = false;
    }

    if (this.initializersLoaded && !force) {
      return { loaded: 0, skipped: 0, files: [], modules: [...this.loadedInitializers] };
    }

    const result = await loadRuntimeInitializersFromDirectory<TContext>({
      initializersDir: this.initializersDir,
      recursive: this.recursive,
      fileExtensions: this.fileExtensions,
      missingDirectoryBehavior: this.missingDirectoryBehavior,
      logger: this.logger,
    });

    this.loadedInitializers.splice(0, this.loadedInitializers.length, ...result.modules);
    this.initializersLoaded = true;

    return result;
  }

  async run(context: TContext, forceLoad = false) {
    const load = await this.loadInitializers(forceLoad);
    const isMaster = this.resolveIsMaster();

    let ranOnce = 0;
    let ranEveryProcess = 0;
    let onceErrors = 0;
    let everyProcessErrors = 0;

    for (const entry of this.loadedInitializers) {
      this.logger?.info?.(`[BOOTSTRAP RUNTIME] load file: ${entry.initializerId}`);

      if (entry.module.once && isMaster) {
        try {
          const info = await entry.module.once(context);
          ranOnce += 1;
          if (typeof info === "string" && info.length > 0) {
            this.logger?.info?.(info, { phase: "once", initializerId: entry.initializerId });
          }
        } catch (error) {
          onceErrors += 1;
          this.logger?.error?.("[BOOTSTRAP RUNTIME] once initializer failed", {
            initializerId: entry.initializerId,
            error,
          });
        }
      }

      if (entry.module.everyProcess) {
        try {
          const info = await entry.module.everyProcess(context);
          ranEveryProcess += 1;
          if (typeof info === "string" && info.length > 0) {
            this.logger?.info?.(info, { phase: "everyProcess", initializerId: entry.initializerId });
          }
        } catch (error) {
          everyProcessErrors += 1;
          this.logger?.error?.("[BOOTSTRAP RUNTIME] everyProcess initializer failed", {
            initializerId: entry.initializerId,
            error,
          });
        }
      }
    }

    return {
      ...load,
      ranOnce,
      ranEveryProcess,
      onceErrors,
      everyProcessErrors,
    };
  }
}
