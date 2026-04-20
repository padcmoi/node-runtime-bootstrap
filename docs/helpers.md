# Runtime Bootstrap Helper Guide

This guide focuses on framework-agnostic usage patterns around `RuntimeBootstrapService`.

## Service Path Convention

Recommended location in your API:

- `src/services/bootstrap.service.ts`

Recommended initializers folder:

- `src/bootstrap/initializers`

Example tree:

```txt
src/
  services/
    bootstrap.service.ts
  bootstrap/
    initializers/
      10_boot.ts
      20_routes.ts
      99_cron.ts
```

## Generic Context Template

```ts
type AppContext = {
  registerHealthEndpoint: () => void;
  warmup: () => Promise<void>;
};
```

## Service Template

```ts
import { join } from "node:path";
import { RuntimeBootstrapService } from "@naskot/node-runtime-bootstrap";

type AppContext = {
  registerHealthEndpoint: () => void;
  warmup: () => Promise<void>;
};

export const bootstrapService = new RuntimeBootstrapService<AppContext>({
  initializersDir: join(__dirname, "../bootstrap/initializers"),
  recursive: false,
  missingDirectoryBehavior: "warn",
  logger: {
    info: (message, meta) => console.info(message, meta ?? ""),
    warn: (message, meta) => console.warn(message, meta ?? ""),
    error: (message, meta) => console.error(message, meta ?? ""),
  },
});
```

## Initializer Template

```ts
import type { RuntimeModule } from "@naskot/node-runtime-bootstrap";

type AppContext = {
  registerHealthEndpoint: () => void;
  warmup: () => Promise<void>;
};

const init = {
  once: async (context: AppContext) => {
    await context.warmup();
    return "once ok";
  },

  everyProcess: (context: AppContext) => {
    context.registerHealthEndpoint();
    return "everyProcess ok";
  },
} satisfies RuntimeModule<AppContext>;

export default init;
```

## Process-Role Helper Patterns

The package is intentionally agnostic. If you need cluster/PM2 behavior, inject your own helper via `isMaster`.

### PM2-like helper (NODE_APP_INSTANCE)

```ts
function isPm2Master() {
  const instance = process.env.NODE_APP_INSTANCE;
  return instance === undefined || instance === "0";
}
```

```ts
isMaster: isPm2Master,
```

### Environment flag helper

```ts
function isMasterByFlag() {
  return process.env.IS_MASTER === "1";
}
```

```ts
isMaster: isMasterByFlag,
```

## App Startup

Call bootstrap during app/API initialization:

```ts
await bootstrapService.run(appContext);
```

## Behavior Summary

- Initializers are loaded in lexicographic order.
- Files are loaded with `require`.
- `once` runs only if `isMaster` resolves to `true`.
- `everyProcess` runs on every call to `run()`.

## Framework-Specific Guides

- Express: [express.md](./express.md)
- NestJS: [nestjs.md](./nestjs.md)
