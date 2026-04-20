# NestJS Integration

Use this package with NestJS while keeping initializers in your app source.

## Recommended Paths

- Service: `src/services/bootstrap.service.ts`
- Initializers: `src/bootstrap/initializers`

## Service (`src/services/bootstrap.service.ts`)

```ts
import { Injectable } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { join } from "node:path";
import { RuntimeBootstrapService } from "@naskot/node-runtime-bootstrap";

@Injectable()
export class AppBootstrapService {
  private readonly runtime = new RuntimeBootstrapService<INestApplication>({
    initializersDir: join(__dirname, "../bootstrap/initializers"),
    recursive: false,
    missingDirectoryBehavior: "warn",
    isMaster: () => process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === "0",
  });

  async run(app: INestApplication) {
    await this.runtime.run(app);
  }
}
```

## Initializer (`src/bootstrap/initializers/20_warmup.ts`)

```ts
import type { RuntimeModule } from "@naskot/node-runtime-bootstrap";
import type { INestApplication } from "@nestjs/common";

const init = {
  once: async (app: INestApplication) => {
    const cache = app.get("CACHE_SERVICE");
    await cache.warmup();
    return "cache warmup done";
  },

  everyProcess: (app: INestApplication) => {
    const bus = app.get("EVENT_BUS");
    bus.registerHandlers();
    return "event handlers registered";
  },
} satisfies RuntimeModule<INestApplication>;

export default init;
```

## Startup (`src/main.ts`)

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppBootstrapService } from "./services/bootstrap.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const appBootstrap = app.get(AppBootstrapService);
  await appBootstrap.run(app);

  await app.listen(3000);
}

void bootstrap();
```
