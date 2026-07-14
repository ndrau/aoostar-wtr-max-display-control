import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DATA_DIR = process.env.DATA_DIR || "/data";
const CONFIG_PATH = `${DATA_DIR}/config.json`;
const DEVICE = process.env.DEVICE || "/dev/ttyACM0";
const ASTERCTL = process.env.ASTERCTL_PATH || "/usr/local/bin/asterctl";
const TRUENAS_LOGO = process.env.TRUENAS_LOGO_PATH || "/app/assets/truenas-scale.png";

const DEFAULT_CONFIG = {
  displayMode: "truenas",
  customImagePath: null,
  schedule: {
    enabled: false,
    displayOnTime: "08:00",
    displayOffTime: "22:00",
  },
};

function resolveArgs(config) {
  switch (config.displayMode) {
    case "truenas":
      return ["--image", TRUENAS_LOGO];
    case "original":
      return ["--on"];
    case "custom":
      if (!config.customImagePath) {
        throw new Error("Custom image path missing");
      }
      return ["--image", config.customImagePath];
    case "off":
    default:
      return ["--off"];
  }
}

async function main() {
  await mkdir(`${DATA_DIR}/uploads`, { recursive: true });

  let config = DEFAULT_CONFIG;

  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    await writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
  }

  const args = ["--device", DEVICE, ...resolveArgs(config)];
  await execFileAsync(ASTERCTL, args, { timeout: 30_000 });
  console.log(`[boot] applied mode: ${config.displayMode}`);
}

main().catch((error) => {
  console.error("[boot] failed to apply display config:", error);
  process.exit(1);
});
