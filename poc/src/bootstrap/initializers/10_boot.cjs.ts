import type { RuntimeModule } from "@naskot/node-runtime-bootstrap";
import type { Express } from "express";

const init = {
  once: (_app: Express) => {
    console.info(`[POC BOOTSTRAP] once executed (${Date()})`);
    return "[POC] master-only initializer done";
  },
  everyProcess: (_app: Express) => {
    console.info(`[POC BOOTSTRAP] everyProcess executed (${Date()})`);
    return "[POC] every-process initializer done";
  },
} satisfies RuntimeModule<Express>;

export default init;
