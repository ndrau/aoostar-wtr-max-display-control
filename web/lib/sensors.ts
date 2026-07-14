import { readFile, stat } from "fs/promises";
import path from "path";
import { SENSOR_DIR } from "./paths";

function parseSensorFile(raw: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values[key] = value;
  }

  return values;
}

export async function readSensorSnapshot(): Promise<{
  path: string;
  values: Record<string, string>;
  updatedAt: string | null;
}> {
  const sensorPath = path.join(SENSOR_DIR, "sysinfo.txt");

  try {
    const raw = await readFile(sensorPath, "utf8");
    const fileStat = await stat(sensorPath);

    return {
      path: sensorPath,
      values: parseSensorFile(raw),
      updatedAt: fileStat.mtime.toISOString(),
    };
  } catch {
    return {
      path: sensorPath,
      values: {},
      updatedAt: null,
    };
  }
}
