# Express Integration

Use this package with Express while keeping initializers in your API codebase.

## Recommended Paths

- Service: `src/services/bootstrap.service.ts`
- Initializers: `src/bootstrap/initializers`

## Service (`src/services/bootstrap.service.ts`)

```ts
import { join } from "node:path";
import { RuntimeBootstrapService } from "@naskot/node-runtime-bootstrap";
import type { Express } from "express";

export const bootstrapService = new RuntimeBootstrapService<Express>({
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

## Initializer (`src/bootstrap/initializers/20_routes.ts`)

```ts
import type { RuntimeModule } from "@naskot/node-runtime-bootstrap";
import type { Express } from "express";

const init = {
  everyProcess: (app: Express) => {
    app.get("/bootstrap-health", (_req, res) => {
      res.json({ ok: true });
    });

    return "bootstrap-health route installed";
  },
} satisfies RuntimeModule<Express>;

export default init;
```

## Startup (`src/app.ts`)

```ts
import express from "express";
import { bootstrapService } from "./services/bootstrap.service";

const app = express();

await bootstrapService.run(app);
```
