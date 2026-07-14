import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { DATA_DIR } from "./paths";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  source: string;
  message: string;
  detail?: string;
}

export const LOG_PATH = path.join(DATA_DIR, "logs", "display.log");
const MAX_LOG_LINES = 500;
let appendChain: Promise<void> = Promise.resolve();

async function ensureLogDir() {
  await mkdir(path.dirname(LOG_PATH), { recursive: true });
}

async function trimLogFile() {
  try {
    const raw = await readFile(LOG_PATH, "utf8");
    const lines = raw.split("\n").filter(Boolean);

    if (lines.length <= MAX_LOG_LINES) {
      return;
    }

    const trimmed = lines.slice(-MAX_LOG_LINES).join("\n") + "\n";
    await writeFile(LOG_PATH, trimmed, "utf8");
  } catch {
    // Log file may not exist yet.
  }
}

async function appendLogUnsafe(
  level: LogLevel,
  source: string,
  message: string,
  detail?: string,
): Promise<LogEntry> {
  await ensureLogDir();

  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    source,
    message,
    ...(detail ? { detail } : {}),
  };

  await appendFile(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  await trimLogFile();

  return entry;
}

export async function appendLog(
  level: LogLevel,
  source: string,
  message: string,
  detail?: string,
): Promise<LogEntry> {
  const next = appendChain.then(() =>
    appendLogUnsafe(level, source, message, detail),
  );
  appendChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function readLogs(limit = 200): Promise<LogEntry[]> {
  try {
    const raw = await readFile(LOG_PATH, "utf8");
    const entries: LogEntry[] = [];

    for (const line of raw.split("\n").filter(Boolean)) {
      try {
        entries.push(JSON.parse(line) as LogEntry);
      } catch {
        entries.push({
          ts: new Date().toISOString(),
          level: "warn",
          source: "logger",
          message: "Skipped corrupt log line",
          detail: line,
        });
      }
    }

    return entries.slice(-limit);
  } catch {
    return [];
  }
}

export async function clearLogs(): Promise<void> {
  await ensureLogDir();
  await writeFile(LOG_PATH, "", "utf8");
}
