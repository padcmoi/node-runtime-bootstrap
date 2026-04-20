export type RuntimeResult = string | void | Promise<string | void>;

export type RuntimeFn<TContext> = (context: TContext) => RuntimeResult;

export interface RuntimeModule<TContext = unknown> {
  once?: RuntimeFn<TContext>;
  everyProcess?: RuntimeFn<TContext>;
}

export interface RuntimeLogger {
  info?: (message: string, meta?: unknown) => void;
  warn?: (message: string, meta?: unknown) => void;
  error?: (message: string, meta?: unknown) => void;
  debug?: (message: string, meta?: unknown) => void;
}

export interface RuntimeLoadOptions {
  initializersDir: string;
  recursive?: boolean;
  fileExtensions?: string[];
  missingDirectoryBehavior?: "warn" | "error" | "ignore";
  logger?: RuntimeLogger;
}

export interface LoadedRuntimeModule<TContext = unknown> {
  initializerId: string;
  filePath: string;
  module: RuntimeModule<TContext>;
}

export interface RuntimeLoadResult<TContext = unknown> {
  loaded: number;
  skipped: number;
  files: string[];
  modules: LoadedRuntimeModule<TContext>[];
}

export interface RuntimeBootstrapServiceOptions extends Omit<RuntimeLoadOptions, "initializersDir"> {
  initializersDir: string;
  logger?: RuntimeLogger;
  isMaster?: boolean | (() => boolean);
}

export interface RuntimeRunResult<TContext = unknown> extends RuntimeLoadResult<TContext> {
  ranOnce: number;
  ranEveryProcess: number;
  onceErrors: number;
  everyProcessErrors: number;
}
