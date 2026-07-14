import { mkdir, readFile, writeFile } from "fs/promises";
import { CONFIG_PATH, DATA_DIR, UPLOAD_DIR } from "./paths";
import { DEFAULT_CONFIG, type DisplayConfig } from "./types";

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export async function readConfig(): Promise<DisplayConfig> {
  await ensureDataDir();

  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DisplayConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      schedule: {
        ...DEFAULT_CONFIG.schedule,
        ...parsed.schedule,
      },
    };
  } catch {
    await writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config: DisplayConfig): Promise<void> {
  await ensureDataDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}
