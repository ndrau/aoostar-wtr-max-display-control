import { readdir, readFile } from "fs/promises";
import path from "path";
import { parseSensorFile } from "./sensors";
import { SENSOR_DIR } from "./paths";

const SYSINFO_FILE = path.join(SENSOR_DIR, "sysinfo.txt");
const HWMON_ROOT = "/sys/class/hwmon";

export async function readHwmonSensors(): Promise<Record<string, string>> {
  const values: Record<string, string> = {};

  try {
    const entries = await readdir(HWMON_ROOT);
    const fanSpeeds: number[] = [];

    for (const entry of entries) {
      if (!entry.startsWith("hwmon")) {
        continue;
      }

      const base = path.join(HWMON_ROOT, entry);
      let files: string[];

      try {
        files = await readdir(base);
      } catch {
        continue;
      }

      for (const file of files) {
        if (!/^fan\d+_input$/.test(file)) {
          continue;
        }

        try {
          const raw = await readFile(path.join(base, file), "utf8");
          const rpm = Number.parseInt(raw.trim(), 10);
          if (!Number.isNaN(rpm) && rpm >= 0) {
            fanSpeeds.push(rpm);
          }
        } catch {
          // Ignore unreadable fan inputs.
        }
      }
    }

    fanSpeeds.sort((left, right) => right - left);

    if (fanSpeeds[0] !== undefined) {
      values.fan_primary_rpm = String(fanSpeeds[0]);
    }

    if (fanSpeeds[1] !== undefined) {
      values.fan_secondary_rpm = String(fanSpeeds[1]);
    }
  } catch {
    return values;
  }

  return values;
}

function deriveCpuUsagePercent(values: Record<string, string>): string | undefined {
  const usages = Object.entries(values)
    .filter(([key]) => /^cpu_.+_usage$/.test(key))
    .map(([, value]) => Number.parseFloat(value))
    .filter((value) => !Number.isNaN(value));

  if (usages.length === 0) {
    return undefined;
  }

  const average = usages.reduce((sum, value) => sum + value, 0) / usages.length;
  return average.toFixed(1);
}

export async function loadAllSensorValues(): Promise<Record<string, string>> {
  let sysinfoValues: Record<string, string> = {};

  try {
    const raw = await readFile(SYSINFO_FILE, "utf8");
    sysinfoValues = parseSensorFile(raw);
  } catch {
    sysinfoValues = {};
  }

  const hwmonValues = await readHwmonSensors();
  const merged = {
    ...sysinfoValues,
    ...hwmonValues,
  };

  if (!merged.cpu_usage_percent) {
    const cpuUsage = deriveCpuUsagePercent(merged);
    if (cpuUsage) {
      merged.cpu_usage_percent = cpuUsage;
    }
  }

  return merged;
}
