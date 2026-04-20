# @naskot/node-runtime-bootstrap

Runtime bootstrap loader for Node.js with ordered initializer files and `once` / `everyProcess` execution.

- Ordered initializer loading from a directory you provide
- `require`-based dynamic loading (same style as starter-template)
- `once(context)` controlled by your own `isMaster` strategy
- `everyProcess(context)` on all processes
- Framework agnostic: context type is generic

## Install

```bash
npm i @naskot/node-runtime-bootstrap
```

## Official Documentation

- Core usage + API: [docs/helpers.md](./docs/helpers.md)
- Express integration: [docs/express.md](./docs/express.md)
- NestJS integration: [docs/nestjs.md](./docs/nestjs.md)

## Quick Start

### 1) Keep initializers in your app (not in the package)

Example tree in your API project:

```txt
src/
  services/
    bootstrap.service.ts
  bootstrap/
    initializers/
      10_boot.ts
      20_routes.ts
```

Each initializer must export a `RuntimeModule`:

```ts
import type { RuntimeModule } from "@naskot/node-runtime-bootstrap";

type AppContext = {
  registerHealthEndpoint: () => void;
};

const init = {
  once: (_context: AppContext) => {
    return "once done";
  },
  everyProcess: (context: AppContext) => {
    context.registerHealthEndpoint();
    return "every-process done";
  },
} satisfies RuntimeModule<AppContext>;

export default init;
```

### 2) Write it in your `src/services/bootstrap.service.ts`

```ts
import { join } from "node:path";
import { RuntimeBootstrapService } from "@naskot/node-runtime-bootstrap";

type AppContext = {
  registerHealthEndpoint: () => void;
};

export const bootstrapService = new RuntimeBootstrapService<AppContext>({
  initializersDir: join(__dirname, "../bootstrap/initializers"),
  recursive: false,
  missingDirectoryBehavior: "warn",
  isMaster: () => process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === "0",
  logger: {
    info: (message, meta) => console.info(message, meta ?? ""),
    warn: (message, meta) => console.warn(message, meta ?? ""),
    error: (message, meta) => console.error(message, meta ?? ""),
  },
});
```

### 3) Run it at app/API startup

```ts
type AppContext = {
  registerHealthEndpoint: () => void;
};

const appContext: AppContext = {
  registerHealthEndpoint: () => {
    // framework-specific route wiring
  },
};

await bootstrapService.run(appContext);
```

### 4) Documentation

How-to guide (usage documentation):

- [docs/helpers.md](./docs/helpers.md) - complete guide on how to use helpers and APIs.
- [docs/express.md](./docs/express.md) - framework-specific Express usage.
- [docs/nestjs.md](./docs/nestjs.md) - framework-specific NestJS usage.

## Process Role Strategy

This library is agnostic and does not depend on PM2.

- If `isMaster` is omitted, `once` runs by default (single-process behavior).
- If you run PM2/cluster/leader-election, provide `isMaster` at instantiation.

## Local checks

```bash
npm run check
npm test
npm run build
```

## POC

A minimal Express POC is available in [`poc/`](./poc):

```bash
cd poc
pnpm install
pnpm dev
pnpm build
node dist/index.js
```
