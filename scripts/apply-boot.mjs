import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { appendBootLog } from "./log-append.mjs";

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
  await appendBootLog("info", "boot", "Container starting, applying display config");
  await mkdir(`${DATA_DIR}/uploads`, { recursive: true });

  let config = DEFAULT_CONFIG;

  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    await writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    await appendBootLog("info", "boot", "Created default config", CONFIG_PATH);
  }

  const args = ["--device", DEVICE, ...resolveArgs(config)];
  const command = `${ASTERCTL} ${args.join(" ")}`;

  await appendBootLog("info", "boot", "Running startup command", command);
  await execFileAsync(ASTERCTL, args, { timeout: 30_000 });
  await appendBootLog(
    "info",
    "boot",
    `Startup complete, mode: ${config.displayMode}`,
  );
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await appendBootLog("error", "boot", "Startup failed", message);
  process.exit(1);
});
