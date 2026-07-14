import { readFile, writeFile } from "fs/promises";
import path from "path";
import { appendLog } from "./logger";
import { CONFIG_DIR, SENSOR_DIR, SENSOR_MAPPING } from "./paths";
import {
  getStoragePanelKeys,
  getStorageUsageFallbacks,
} from "./sensor-fields";
import { loadAllSensorValues } from "./sensor-sources";

const PANEL_SENSOR_FILE = path.join(SENSOR_DIR, "panel.txt");
const MAPPING_FILE = path.join(CONFIG_DIR, SENSOR_MAPPING);

const REFRESH_MS = 2_000;

const DEFAULT_PANEL_MAP: Record<string, string> = {
  cpu_percent: "cpu_usage_percent",
  cpu_temperature: "temperature_cpu",
  memory_usage: "mem_usage_percent",
  memory_Temperature: "temperature_memory",
  gpu_temperature: "temperature_gpu",
  gpu_core: "gpu_usage_percent",
  motherboard_temperature: "temperature_motherboard",
};

const DYNAMIC_PANEL_SOURCES: Record<
  string,
  (values: Record<string, string>) => string | undefined
> = {
  net_upload_speed: (values) => findNetworkSourceKey(values, "_upload_speed"),
  net_download_speed: (values) => findNetworkSourceKey(values, "_download_speed"),
  net_ip_address: (values) => findNetworkSourceKey(values, "_address0"),
};

const FAN_PANEL_MAP: Record<string, string> = {
  fan_cpu_rpm: "fan_primary_rpm",
  fan_system_rpm: "fan_secondary_rpm",
};

let mapperTimer: NodeJS.Timeout | null = null;

function findNetworkSourceKey(
  values: Record<string, string>,
  suffix: string,
): string | undefined {
  return Object.keys(values)
    .filter((key) => key.startsWith("network_") && key.endsWith(suffix))
    .sort()[0];
}

function appendMappedValue(
  lines: string[],
  panelKey: string,
  sourceKey: string | undefined,
  values: Record<string, string>,
): void {
  if (!sourceKey) {
    return;
  }

  const value = values[sourceKey];
  if (value === undefined) {
    return;
  }

  lines.push(`${panelKey}: ${value}`);

  const unit = values[`${sourceKey}#unit`];
  if (unit) {
    lines.push(`${panelKey}#unit: ${unit}`);
  }
}

async function loadPanelMap(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(MAPPING_FILE, "utf8");
    const map = { ...DEFAULT_PANEL_MAP };

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf(":");
      if (separator === -1) {
        continue;
      }

      const panelKey = trimmed.slice(0, separator).trim();
      const sysinfoKey = trimmed.slice(separator + 1).trim();
      if (panelKey && sysinfoKey) {
        map[panelKey] = sysinfoKey;
      }
    }

    return map;
  } catch {
    return DEFAULT_PANEL_MAP;
  }
}

function formatPanelDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function appendStoragePanelValues(
  lines: string[],
  values: Record<string, string>,
): void {
  for (const panelKey of getStoragePanelKeys(values)) {
    lines.push(`${panelKey}: ${values[panelKey]}`);
    const unit = values[`${panelKey}#unit`];
    if (unit) {
      lines.push(`${panelKey}#unit: ${unit}`);
    }
  }

  for (const fallback of getStorageUsageFallbacks(values)) {
    lines.push(`${fallback.panelKey}: ${fallback.value}`);
  }
}

export async function writePanelSensorFile(): Promise<void> {
  const sysinfoValues = await loadAllSensorValues();
  if (Object.keys(sysinfoValues).length === 0) {
    return;
  }

  const panelMap = await loadPanelMap();
  const lines: string[] = [];

  for (const [panelKey, sysinfoKey] of Object.entries(panelMap)) {
    appendMappedValue(lines, panelKey, sysinfoKey, sysinfoValues);
  }

  for (const [panelKey, resolveSourceKey] of Object.entries(
    DYNAMIC_PANEL_SOURCES,
  )) {
    appendMappedValue(
      lines,
      panelKey,
      resolveSourceKey(sysinfoValues),
      sysinfoValues,
    );
  }

  for (const [panelKey, sourceKey] of Object.entries(FAN_PANEL_MAP)) {
    appendMappedValue(lines, panelKey, sourceKey, sysinfoValues);
  }

  appendStoragePanelValues(lines, sysinfoValues);
  lines.push(`DATE_m_d_h_m_2: ${formatPanelDate(new Date())}`);

  await writeFile(PANEL_SENSOR_FILE, `${lines.join("\n")}\n`, "utf8");
}

export function isPanelSensorMapperRunning(): boolean {
  return mapperTimer !== null;
}

export function startPanelSensorMapper(): void {
  stopPanelSensorMapper();

  const tick = () => {
    writePanelSensorFile().catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      void appendLog("error", "panel-mapper", "Failed to map sensor file", message);
    });
  };

  tick();
  mapperTimer = setInterval(tick, REFRESH_MS);
}

export function stopPanelSensorMapper(): void {
  if (mapperTimer) {
    clearInterval(mapperTimer);
    mapperTimer = null;
  }
}
