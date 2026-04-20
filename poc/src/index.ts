import express from "express";
import { bootstrapService } from "./services/bootstrap.service";

async function bootstrap() {
  const app = express();

  await bootstrapService.run(app);

  app.get("/", (_req, res) => {
    res.json({ ok: true, package: "@naskot/node-runtime-bootstrap" });
  });

  const server = app.listen(0, () => {
    console.info("Runtime bootstrap POC started");
  });

  const shutdown = () => {
    server.close();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void bootstrap();
