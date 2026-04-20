import { join } from "node:path";
import { RuntimeBootstrapService } from "@naskot/node-runtime-bootstrap";
import type { Express } from "express";

export const bootstrapService = new RuntimeBootstrapService<Express>({
  initializersDir: join(__dirname, "../bootstrap/initializers"),
  recursive: false,
  missingDirectoryBehavior: "warn",
  logger: {
    info: (message, meta) => console.info(message, meta ?? ""),
    warn: (message, meta) => console.warn(message, meta ?? ""),
    error: (message, meta) => console.error(message, meta ?? ""),
  },
});
