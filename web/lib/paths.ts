import path from "path";

export const DATA_DIR = process.env.DATA_DIR || "/data";
export const CONFIG_PATH = path.join(DATA_DIR, "config.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const TRUENAS_LOGO_PATH =
  process.env.TRUENAS_LOGO_PATH || "/app/assets/truenas-scale.png";
export const ASTERCTL_PATH =
  process.env.ASTERCTL_PATH || "/usr/local/bin/asterctl";
export const DEVICE = process.env.DEVICE || "/dev/ttyACM0";
