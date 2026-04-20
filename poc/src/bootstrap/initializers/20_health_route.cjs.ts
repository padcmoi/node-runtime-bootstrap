import type { RuntimeModule } from "@naskot/node-runtime-bootstrap";
import type { Express } from "express";

const init = {
  everyProcess: (app: Express) => {
    app.get("/bootstrap-health", (_req, res) => {
      res.json({ ok: true, source: "initializer" });
    });

    return "[POC] /bootstrap-health route installed";
  },
} satisfies RuntimeModule<Express>;

export default init;
