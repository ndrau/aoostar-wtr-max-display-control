import { mkdir, readFile, writeFile } from "fs/promises";
import { CONFIG_PATH, DATA_DIR, UPLOAD_DIR } from "./paths";
import { DEFAULT_CONFIG, type DisplayConfig } from "./types";
import { normalizeConfig } from "./validation";

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
}

/** Overlays a partial update (e.g. an API body) onto a full config, section by section. */
export function mergeConfig(
  base: DisplayConfig,
  patch: Partial<DisplayConfig>,
): Partial<DisplayConfig> {
  return {
    ...base,
    ...patch,
    logo: { ...base.logo, ...patch.logo },
    textBanner: { ...base.textBanner, ...patch.textBanner },
    overlay: {
      ...base.overlay,
      ...patch.overlay,
      corners: { ...base.overlay.corners, ...patch.overlay?.corners },
    },
    schedule: { ...base.schedule, ...patch.schedule },
  };
}

export async function readConfig(): Promise<DisplayConfig> {
  await ensureDataDir();

  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return normalizeConfig(JSON.parse(raw));
  } catch {
    await writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config: DisplayConfig): Promise<void> {
  await ensureDataDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}
