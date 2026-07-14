import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || "/data";
const LOG_PATH = path.join(DATA_DIR, "logs", "display.log");

export async function appendBootLog(level, source, message, detail) {
  await mkdir(path.dirname(LOG_PATH), { recursive: true });

  const entry = {
    ts: new Date().toISOString(),
    level,
    source,
    message,
    ...(detail ? { detail } : {}),
  };

  await appendFile(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
}
