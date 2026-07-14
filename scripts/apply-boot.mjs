import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { appendBootLog } from "./log-append.mjs";

const execFileAsync = promisify(execFile);

const DATA_DIR = process.env.DATA_DIR || "/data";
const CONFIG_PATH = `${DATA_DIR}/config.json`;
const UPLOAD_DIR = `${DATA_DIR}/uploads`;
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

function mergeConfig(parsed) {
  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    schedule: {
      ...DEFAULT_CONFIG.schedule,
      ...parsed?.schedule,
    },
  };
}

function sanitizeCustomImagePath(value) {
  if (!value) {
    return null;
  }

  const resolved = path.resolve(value);
  const uploadRoot = path.resolve(UPLOAD_DIR);

  if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error("Custom image path must stay inside uploads directory");
  }

  return resolved;
}

async function fileExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function resolveArgs(config) {
  switch (config.displayMode) {
    case "truenas":
      return ["--image", TRUENAS_LOGO];
    case "original":
      return ["--on"];
    case "custom": {
      const imagePath = sanitizeCustomImagePath(config.customImagePath);
      if (!imagePath) {
        throw new Error("Custom image path missing");
      }
      return ["--image", imagePath];
    }
    case "off":
      return ["--off"];
    default:
      return ["--image", TRUENAS_LOGO];
  }
}

async function main() {
  await appendBootLog("info", "boot", "Container starting, applying display config");
  await mkdir(UPLOAD_DIR, { recursive: true });

  let config = DEFAULT_CONFIG;

  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    config = mergeConfig(JSON.parse(raw));
  } catch {
    await writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    await appendBootLog("info", "boot", "Created default config", CONFIG_PATH);
  }

  if (config.displayMode === "custom") {
    const imagePath = sanitizeCustomImagePath(config.customImagePath);
    if (!imagePath || !(await fileExists(imagePath))) {
      await appendBootLog(
        "warn",
        "boot",
        "Custom image missing, falling back to TrueNAS logo",
        String(config.customImagePath),
      );
      config = { ...config, displayMode: "truenas", customImagePath: null };
    }
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
