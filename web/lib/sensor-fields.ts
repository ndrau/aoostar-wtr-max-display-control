import { formatBitRate, formatBytes } from "./format";

/** Overlay slots: five along the top edge, five along the bottom edge. */
export type BannerCorner =
  | "topLeft"
  | "topLeftInner"
  | "topCenter"
  | "topRightInner"
  | "topRight"
  | "bottomLeft"
  | "bottomLeftInner"
  | "bottomCenter"
  | "bottomRightInner"
  | "bottomRight";

export type SensorFieldId =
  | "none"
  | "cpu_usage_percent"
  | "temperature_cpu"
  | "mem_usage_percent"
  | "temperature_memory"
  | "temperature_gpu"
  | "temperature_motherboard"
  | "system_uptime"
  | "load_average_1m"
  | "network_primary_upload_speed"
  | "network_primary_download_speed"
  | "network_primary_address"
  | "fan_primary_rpm"
  | "fan_secondary_rpm"
  | "storage_ssd_0_used"
  | "storage_ssd_0_temperature"
  | "storage_ssd_1_used"
  | "storage_ssd_1_temperature"
  | "storage_hdd_0_used"
  | "storage_hdd_0_temperature"
  | "storage_hdd_1_used"
  | "storage_hdd_1_temperature"
  | "storage_pool_free";

export type TextBannerCorners = Record<BannerCorner, SensorFieldId>;

export interface SensorFieldOption {
  id: SensorFieldId;
  label: string;
  shortLabel: string;
}

export interface SensorFieldGroup {
  label: string;
  options: SensorFieldOption[];
}

export const SENSOR_FIELD_GROUPS: SensorFieldGroup[] = [
  {
    label: "Allgemein",
    options: [
      { id: "none", label: "Keine", shortLabel: "" },
      { id: "cpu_usage_percent", label: "CPU-Auslastung", shortLabel: "CPU" },
      { id: "temperature_cpu", label: "CPU-Temperatur", shortLabel: "CPU" },
      { id: "mem_usage_percent", label: "RAM-Auslastung", shortLabel: "RAM" },
      { id: "temperature_memory", label: "RAM-Temperatur", shortLabel: "RAM" },
      { id: "temperature_gpu", label: "GPU-Temperatur", shortLabel: "GPU" },
      {
        id: "temperature_motherboard",
        label: "Mainboard-Temperatur",
        shortLabel: "Board",
      },
      { id: "system_uptime", label: "Laufzeit", shortLabel: "Uptime" },
      { id: "load_average_1m", label: "Last (1 Min.)", shortLabel: "Load" },
    ],
  },
  {
    label: "Netzwerk",
    options: [
      {
        id: "network_primary_upload_speed",
        label: "Upload",
        shortLabel: "↑",
      },
      {
        id: "network_primary_download_speed",
        label: "Download",
        shortLabel: "↓",
      },
      {
        id: "network_primary_address",
        label: "IP-Adresse",
        shortLabel: "IP",
      },
    ],
  },
  {
    label: "Lüfter",
    options: [
      { id: "fan_primary_rpm", label: "Lüfter 1 (U/min)", shortLabel: "Fan1" },
      {
        id: "fan_secondary_rpm",
        label: "Lüfter 2 (U/min)",
        shortLabel: "Fan2",
      },
    ],
  },
  {
    label: "SSD / NVMe",
    options: [
      { id: "storage_pool_free", label: "Pool frei (/data)", shortLabel: "Frei" },
      { id: "storage_ssd_0_used", label: "SSD 1 belegt", shortLabel: "SSD1" },
      {
        id: "storage_ssd_0_temperature",
        label: "SSD 1 Temperatur",
        shortLabel: "SSD1",
      },
      { id: "storage_ssd_1_used", label: "SSD 2 belegt", shortLabel: "SSD2" },
      {
        id: "storage_ssd_1_temperature",
        label: "SSD 2 Temperatur",
        shortLabel: "SSD2",
      },
    ],
  },
  {
    label: "HDD",
    options: [
      { id: "storage_hdd_0_used", label: "HDD 1 belegt", shortLabel: "HDD1" },
      {
        id: "storage_hdd_0_temperature",
        label: "HDD 1 Temperatur",
        shortLabel: "HDD1",
      },
      { id: "storage_hdd_1_used", label: "HDD 2 belegt", shortLabel: "HDD2" },
      {
        id: "storage_hdd_1_temperature",
        label: "HDD 2 Temperatur",
        shortLabel: "HDD2",
      },
    ],
  },
];

export const SENSOR_FIELD_OPTIONS: SensorFieldOption[] = SENSOR_FIELD_GROUPS.flatMap(
  (group) => group.options,
);

const SENSOR_FIELD_IDS = new Set(
  SENSOR_FIELD_OPTIONS.map((option) => option.id),
);

type StorageKind = "ssd" | "hdd";
type StorageMetric = "used" | "temperature";

function storagePanelKey(
  kind: StorageKind,
  index: number,
  metric: StorageMetric,
): string {
  return `storage_${kind}[${index}]['${metric}']`;
}

function storageSysinfoCandidates(
  kind: StorageKind,
  index: number,
  metric: StorageMetric,
): string[] {
  const panelKey = storagePanelKey(kind, index, metric);

  if (metric === "used") {
    return [
      panelKey,
      `storage_${kind}[${index}]_usage_percent`,
      `storage_${kind}[${index}]_total_used_percent`,
    ];
  }

  return [panelKey, `storage_${kind}[${index}]_temperature`];
}

function findFirstValue(
  values: Record<string, string>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = values[key];
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function parseStorageFieldId(
  fieldId: SensorFieldId,
): { kind: StorageKind; index: number; metric: StorageMetric } | null {
  const match = fieldId.match(/^storage_(ssd|hdd)_(\d+)_(used|temperature)$/);
  if (!match) {
    return null;
  }

  return {
    kind: match[1] as StorageKind,
    index: Number.parseInt(match[2], 10),
    metric: match[3] as StorageMetric,
  };
}

/** aster-sysinfo fallback: the interface that has moved the most data. */
function findNetworkKey(
  values: Record<string, string>,
  suffix: "upload_speed" | "download_speed" | "address0",
): string | undefined {
  const busiest = Object.keys(values)
    .filter((key) => /^network_.+_total_received_bytes$/.test(key))
    .sort(
      (left, right) =>
        Number.parseFloat(values[right]) - Number.parseFloat(values[left]),
    )[0];
  const prefix = busiest?.replace(/_total_received_bytes$/, "");
  return prefix ? values[`${prefix}_${suffix}`] : undefined;
}

function formatUptime(value: string): string {
  const seconds = Number.parseFloat(value);
  if (Number.isNaN(seconds)) {
    return value;
  }
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
}

export function isSensorFieldId(value: unknown): value is SensorFieldId {
  return typeof value === "string" && SENSOR_FIELD_IDS.has(value as SensorFieldId);
}

export function resolveSensorValue(
  fieldId: SensorFieldId,
  values: Record<string, string>,
): string | undefined {
  if (fieldId === "none") {
    return undefined;
  }

  if (fieldId === "network_primary_upload_speed") {
    return (
      values.host_network_upload_bytes_per_sec ??
      findNetworkKey(values, "upload_speed")
    );
  }

  if (fieldId === "network_primary_download_speed") {
    return (
      values.host_network_download_bytes_per_sec ??
      findNetworkKey(values, "download_speed")
    );
  }

  if (fieldId === "network_primary_address") {
    return values.host_network_address ?? findNetworkKey(values, "address0");
  }

  if (fieldId === "system_uptime") {
    return values.system_uptime_seconds ?? values.system_uptime;
  }

  if (fieldId === "storage_pool_free") {
    return values.storage_pool_free_bytes;
  }

  if (fieldId === "load_average_1m") {
    return values.load_avg_one ?? values.load_average_1m;
  }

  const storageField = parseStorageFieldId(fieldId);
  if (storageField) {
    // aster-sysinfo reports 0 for disks it cannot see (e.g. ZFS members).
    const sizeKey = `storage_${storageField.kind}[${storageField.index}]_total_size_bytes`;
    if (storageField.metric === "used" && values[sizeKey] === "0") {
      return undefined;
    }

    return findFirstValue(
      values,
      storageSysinfoCandidates(
        storageField.kind,
        storageField.index,
        storageField.metric,
      ),
    );
  }

  return values[fieldId];
}

function formatPercent(value: string): string {
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) {
    return value;
  }
  return `${Math.round(numeric)}%`;
}

function formatTemperature(value: string): string {
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) {
    return value;
  }
  return `${Math.round(numeric)}°C`;
}

function formatRpm(value: string): string {
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) {
    return value;
  }
  return `${Math.round(numeric)} RPM`;
}

export function formatSensorFieldValue(
  fieldId: SensorFieldId,
  rawValue: string | undefined,
  values: Record<string, string> = {},
): string {
  if (fieldId === "none") {
    return "";
  }

  if (!rawValue) {
    return "—";
  }

  switch (fieldId) {
    case "cpu_usage_percent":
    case "mem_usage_percent":
    case "storage_ssd_0_used":
    case "storage_ssd_1_used":
    case "storage_hdd_0_used":
    case "storage_hdd_1_used":
      return formatPercent(rawValue);
    case "temperature_cpu":
    case "temperature_memory":
    case "temperature_gpu":
    case "temperature_motherboard":
    case "storage_ssd_0_temperature":
    case "storage_ssd_1_temperature":
    case "storage_hdd_0_temperature":
    case "storage_hdd_1_temperature":
      return formatTemperature(rawValue);
    case "fan_primary_rpm":
    case "fan_secondary_rpm":
      return formatRpm(rawValue);
    case "system_uptime":
      return formatUptime(rawValue);
    case "storage_pool_free": {
      const bytes = Number.parseFloat(rawValue);
      return Number.isNaN(bytes) ? rawValue : formatBytes(bytes);
    }
    case "network_primary_upload_speed":
    case "network_primary_download_speed": {
      // Host counters arrive as plain bytes per second.
      if (/^[\d.]+$/.test(rawValue)) {
        return formatBitRate(Number.parseFloat(rawValue));
      }
      const speedKey = Object.keys(values)
        .filter((key) =>
          fieldId === "network_primary_upload_speed"
            ? key.endsWith("_upload_speed")
            : key.endsWith("_download_speed"),
        )
        .sort()[0];
      const speedUnit = speedKey ? values[`${speedKey}#unit`] : undefined;
      return speedUnit ? `${rawValue} ${speedUnit}` : rawValue;
    }
    default:
      return rawValue;
  }
}

export function formatCornerLabel(
  fieldId: SensorFieldId,
  values: Record<string, string> = {},
): string | null {
  if (fieldId === "none") {
    return null;
  }

  const option = SENSOR_FIELD_OPTIONS.find((entry) => entry.id === fieldId);
  if (!option) {
    return null;
  }

  const rawValue = resolveSensorValue(fieldId, values);
  const formatted = formatSensorFieldValue(fieldId, rawValue, values);

  if (fieldId === "temperature_cpu" || fieldId === "cpu_usage_percent") {
    return `CPU ${formatted}`;
  }
  if (fieldId === "mem_usage_percent" || fieldId === "temperature_memory") {
    return `RAM ${formatted}`;
  }
  if (fieldId === "temperature_gpu") {
    return `GPU ${formatted}`;
  }
  if (fieldId === "temperature_motherboard") {
    return `Board ${formatted}`;
  }
  if (fieldId === "network_primary_upload_speed") {
    return `↑ ${formatted}`;
  }
  if (fieldId === "network_primary_download_speed") {
    return `↓ ${formatted}`;
  }
  if (fieldId === "network_primary_address") {
    return formatted;
  }
  if (fieldId === "fan_primary_rpm" || fieldId === "fan_secondary_rpm") {
    return formatted;
  }

  const storageField = parseStorageFieldId(fieldId);
  if (storageField) {
    const prefix =
      storageField.kind === "ssd"
        ? `SSD${storageField.index + 1}`
        : `HDD${storageField.index + 1}`;
    return `${prefix} ${formatted}`;
  }

  return `${option.shortLabel} ${formatted}`;
}

export function hasCornerSensors(corners: TextBannerCorners): boolean {
  return Object.values(corners).some((fieldId) => fieldId !== "none");
}

export function shouldShowCornerSensors(settings: {
  showCornerSensors: boolean;
  corners: TextBannerCorners;
}): boolean {
  return settings.showCornerSensors && hasCornerSensors(settings.corners);
}

export function needsOverlayLiveRefresh(settings: {
  showClock: boolean;
  showCornerSensors: boolean;
  corners: TextBannerCorners;
}): boolean {
  return settings.showClock || shouldShowCornerSensors(settings);
}

export const DEFAULT_TEXT_BANNER_CORNERS: TextBannerCorners = {
  topLeft: "none",
  topLeftInner: "none",
  topCenter: "none",
  topRightInner: "none",
  topRight: "none",
  bottomLeft: "none",
  bottomLeftInner: "none",
  bottomCenter: "none",
  bottomRightInner: "none",
  bottomRight: "none",
};

export const BANNER_CORNER_LABELS: Record<BannerCorner, string> = {
  topLeft: "Oben links",
  topLeftInner: "Oben halblinks",
  topCenter: "Oben Mitte",
  topRightInner: "Oben halbrechts",
  topRight: "Oben rechts",
  bottomLeft: "Unten links",
  bottomLeftInner: "Unten halblinks",
  bottomCenter: "Unten Mitte",
  bottomRightInner: "Unten halbrechts",
  bottomRight: "Unten rechts",
};

export const BANNER_CORNERS = Object.keys(BANNER_CORNER_LABELS) as BannerCorner[];

export function getStoragePanelKeys(values: Record<string, string>): string[] {
  return Object.keys(values).filter((key) =>
    /^storage_(ssd|hdd)\[\d+\]\['(used|temperature)'\]$/.test(key),
  );
}

export function getStorageUsageFallbacks(
  values: Record<string, string>,
): Array<{ panelKey: string; sourceKey: string; value: string }> {
  const fallbacks: Array<{ panelKey: string; sourceKey: string; value: string }> =
    [];

  for (const [sourceKey, value] of Object.entries(values)) {
    const match = sourceKey.match(/^storage_(ssd|hdd)\[(\d+)\]_usage_percent$/);
    if (!match) {
      continue;
    }

    const panelKey = `storage_${match[1]}[${match[2]}]['used']`;
    if (values[panelKey] !== undefined) {
      continue;
    }

    fallbacks.push({ panelKey, sourceKey, value });
  }

  return fallbacks;
}

export function getStorageTemperatureFallbacks(
  values: Record<string, string>,
): Array<{ panelKey: string; sourceKey: string; value: string }> {
  const fallbacks: Array<{ panelKey: string; sourceKey: string; value: string }> =
    [];

  for (const [sourceKey, value] of Object.entries(values)) {
    const match = sourceKey.match(/^storage_(ssd|hdd)\[(\d+)\]_temperature$/);
    if (!match || !value.trim()) {
      continue;
    }

    const panelKey = `storage_${match[1]}[${match[2]}]['temperature']`;
    if (values[panelKey] !== undefined) {
      continue;
    }

    fallbacks.push({ panelKey, sourceKey, value });
  }

  return fallbacks;
}
