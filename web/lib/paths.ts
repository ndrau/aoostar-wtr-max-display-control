import path from "path";

export const DATA_DIR = process.env.DATA_DIR || "/data";
export const CONFIG_PATH = path.join(DATA_DIR, "config.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const SCENE_PATH = path.join(UPLOAD_DIR, "scene.png");
export const LOGO_DIR =
  process.env.LOGO_DIR || path.join(process.cwd(), "public", "logos");
export const ASTERCTL_PATH =
  process.env.ASTERCTL_PATH || "/usr/local/bin/asterctl";
export const ASTER_SYSINFO_PATH =
  process.env.ASTER_SYSINFO_PATH || "/usr/local/bin/aster-sysinfo";
export const CONFIG_DIR = process.env.CONFIG_DIR || "/app/cfg";
export const FONT_DIR = process.env.FONT_DIR || "/app/fonts";
export const SENSOR_DIR = path.join(DATA_DIR, "sensors");
export const SENSOR_MAPPING =
  process.env.SENSOR_MAPPING || "sensor-mapping/truenas-default.cfg";
export const DEVICE = process.env.DEVICE || "/dev/ttyACM0";
