import { stat } from "fs/promises";
import { loadAllSensorValues } from "./sensor-sources";
import { SENSOR_DIR } from "./paths";

export function parseSensorFile(raw: string): Record<string, string> {
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
  const sensorPath = `${SENSOR_DIR}/sysinfo.txt`;

  try {
    const values = await loadAllSensorValues();
    let updatedAt: string | null = null;

    try {
      const fileStat = await stat(sensorPath);
      updatedAt = fileStat.mtime.toISOString();
    } catch {
      updatedAt = null;
    }

    return {
      path: sensorPath,
      values,
      updatedAt,
    };
  } catch {
    return {
      path: sensorPath,
      values: {},
      updatedAt: null,
    };
  }
}
