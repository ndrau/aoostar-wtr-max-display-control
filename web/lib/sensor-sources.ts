import { readdir, readFile, statfs } from "fs/promises";
import path from "path";
import { readNetworkSnapshot } from "./network";
import { parseSensorFile } from "./sensors";
import { DATA_DIR, SENSOR_DIR } from "./paths";

const SYSINFO_FILE = path.join(SENSOR_DIR, "sysinfo.txt");
const HWMON_ROOT = "/sys/class/hwmon";
const NVME_ROOT = "/sys/class/nvme";
const BLOCK_ROOT = "/sys/block";

async function readFirstHwmonTemp(baseDir: string): Promise<number | undefined> {
  try {
    const hwmonEntries = await readdir(baseDir);

    for (const hwmonEntry of hwmonEntries.sort()) {
      if (!hwmonEntry.startsWith("hwmon")) {
        continue;
      }

      const hwmonPath = path.join(baseDir, hwmonEntry);
      const files = await readdir(hwmonPath);

      for (const file of files) {
        if (!/^temp\d+_input$/.test(file)) {
          continue;
        }

        const raw = await readFile(path.join(hwmonPath, file), "utf8");
        const milliCelsius = Number.parseInt(raw.trim(), 10);
        if (!Number.isNaN(milliCelsius) && milliCelsius > 0) {
          return milliCelsius / 1000;
        }
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function readNvmeDiskTemperatures(): Promise<Record<string, string>> {
  const values: Record<string, string> = {};

  try {
    const entries = (await readdir(NVME_ROOT))
      .filter((entry) => /^nvme\d+$/.test(entry))
      .sort();

    for (const [index, entry] of entries.entries()) {
      // Newer kernels register the hwmon directly below the controller.
      const temp =
        (await readFirstHwmonTemp(path.join(NVME_ROOT, entry, "device", "hwmon"))) ??
        (await readFirstHwmonTemp(path.join(NVME_ROOT, entry)));

      if (temp !== undefined) {
        values[`storage_ssd[${index}]_temperature`] = `${temp.toFixed(1)} °C`;
      }
    }
  } catch {
    return values;
  }

  return values;
}

async function readRotationalDiskTemperatures(): Promise<Record<string, string>> {
  const values: Record<string, string> = {};

  try {
    const entries = (await readdir(BLOCK_ROOT))
      .filter((entry) => /^sd[a-z]+$/.test(entry))
      .sort();

    let hddIndex = 0;

    for (const entry of entries) {
      const rotationalPath = path.join(BLOCK_ROOT, entry, "queue/rotational");
      const removablePath = path.join(BLOCK_ROOT, entry, "removable");

      let rotational = "1";
      let removable = "0";

      try {
        rotational = (await readFile(rotationalPath, "utf8")).trim();
        removable = (await readFile(removablePath, "utf8")).trim();
      } catch {
        continue;
      }

      if (removable === "1" || rotational !== "1") {
        continue;
      }

      const temp = await readFirstHwmonTemp(
        path.join(BLOCK_ROOT, entry, "device", "hwmon"),
      );

      if (temp !== undefined) {
        values[`storage_hdd[${hddIndex}]_temperature`] = `${temp.toFixed(1)} °C`;
        hddIndex += 1;
      }
    }
  } catch {
    return values;
  }

  return values;
}

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

async function readHostNetwork(): Promise<Record<string, string>> {
  const values: Record<string, string> = {};

  try {
    const snapshot = await readNetworkSnapshot();
    const primary = snapshot.interfaces[0];
    if (!primary) return values;

    values.host_network_interface = primary.name;
    if (primary.rxBytesPerSec !== null) {
      values.host_network_download_bytes_per_sec = String(primary.rxBytesPerSec);
    }
    if (primary.txBytesPerSec !== null) {
      values.host_network_upload_bytes_per_sec = String(primary.txBytesPerSec);
    }
    if (primary.ipv4[0]) {
      values.host_network_address = primary.ipv4[0];
    }
  } catch {
    return values;
  }

  return values;
}

async function readUptime(): Promise<Record<string, string>> {
  try {
    // /proc/uptime is not namespaced, so this is the host's uptime.
    const raw = await readFile("/proc/uptime", "utf8");
    const seconds = Number.parseFloat(raw.split(" ")[0]);
    return Number.isNaN(seconds) ? {} : { system_uptime_seconds: String(seconds) };
  } catch {
    return {};
  }
}

async function readDataPoolFree(): Promise<Record<string, string>> {
  try {
    // Free space of the dataset behind /data equals the pool's free space
    // unless the dataset has a quota.
    const stats = await statfs(DATA_DIR);
    return { storage_pool_free_bytes: String(stats.bavail * stats.bsize) };
  } catch {
    return {};
  }
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
  const nvmeTemps = await readNvmeDiskTemperatures();
  const hddTemps = await readRotationalDiskTemperatures();
  const [networkValues, uptimeValues, poolValues] = await Promise.all([
    readHostNetwork(),
    readUptime(),
    readDataPoolFree(),
  ]);
  const merged: Record<string, string> = {
    ...sysinfoValues,
    ...hwmonValues,
    ...nvmeTemps,
    ...hddTemps,
    ...networkValues,
    ...uptimeValues,
    ...poolValues,
  };

  for (const [key, value] of Object.entries({ ...nvmeTemps, ...hddTemps })) {
    const existing = merged[key];
    if (!existing?.trim() || existing === "0" || existing === "0.0 °C") {
      merged[key] = value;
    }
  }

  if (!merged.cpu_usage_percent) {
    const cpuUsage = deriveCpuUsagePercent(merged);
    if (cpuUsage) {
      merged.cpu_usage_percent = cpuUsage;
    }
  }

  return merged;
}
