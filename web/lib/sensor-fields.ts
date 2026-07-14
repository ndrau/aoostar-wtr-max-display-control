export type BannerCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export type SensorFieldId =
  | "none"
  | "cpu_usage_percent"
  | "temperature_cpu"
  | "mem_usage_percent"
  | "temperature_memory"
  | "temperature_gpu"
  | "system_uptime"
  | "load_average_1m"
  | "network_primary_upload_speed"
  | "network_primary_download_speed"
  | "network_primary_address";

export interface TextBannerCorners {
  topLeft: SensorFieldId;
  topRight: SensorFieldId;
  bottomLeft: SensorFieldId;
  bottomRight: SensorFieldId;
}

export interface SensorFieldOption {
  id: SensorFieldId;
  label: string;
  shortLabel: string;
}

export const SENSOR_FIELD_OPTIONS: SensorFieldOption[] = [
  { id: "none", label: "None", shortLabel: "" },
  { id: "cpu_usage_percent", label: "CPU usage", shortLabel: "CPU" },
  { id: "temperature_cpu", label: "CPU temperature", shortLabel: "CPU" },
  { id: "mem_usage_percent", label: "RAM usage", shortLabel: "RAM" },
  { id: "temperature_memory", label: "RAM temperature", shortLabel: "RAM" },
  { id: "temperature_gpu", label: "GPU temperature", shortLabel: "GPU" },
  { id: "system_uptime", label: "System uptime", shortLabel: "Up" },
  { id: "load_average_1m", label: "Load average (1m)", shortLabel: "Load" },
  {
    id: "network_primary_upload_speed",
    label: "Network upload (primary)",
    shortLabel: "Up",
  },
  {
    id: "network_primary_download_speed",
    label: "Network download (primary)",
    shortLabel: "Down",
  },
  {
    id: "network_primary_address",
    label: "Network IP (primary)",
    shortLabel: "IP",
  },
];

const SENSOR_FIELD_IDS = new Set(
  SENSOR_FIELD_OPTIONS.map((option) => option.id),
);

export function isSensorFieldId(value: unknown): value is SensorFieldId {
  return typeof value === "string" && SENSOR_FIELD_IDS.has(value as SensorFieldId);
}

function findNetworkKey(
  values: Record<string, string>,
  suffix: "upload_speed" | "download_speed" | "address0",
): string | undefined {
  const match = Object.keys(values).find((key) =>
    key.startsWith("network_") && key.endsWith(`_${suffix}`),
  );
  return match ? values[match] : undefined;
}

export function resolveSensorValue(
  fieldId: SensorFieldId,
  values: Record<string, string>,
): string | undefined {
  if (fieldId === "none") {
    return undefined;
  }

  if (fieldId === "network_primary_upload_speed") {
    return findNetworkKey(values, "upload_speed");
  }

  if (fieldId === "network_primary_download_speed") {
    return findNetworkKey(values, "download_speed");
  }

  if (fieldId === "network_primary_address") {
    return findNetworkKey(values, "address0");
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
      return formatPercent(rawValue);
    case "temperature_cpu":
    case "temperature_memory":
    case "temperature_gpu":
      return formatTemperature(rawValue);
    case "network_primary_upload_speed":
    case "network_primary_download_speed": {
      const speedKey = Object.keys(values).find((key) =>
        fieldId === "network_primary_upload_speed"
          ? key.endsWith("_upload_speed")
          : key.endsWith("_download_speed"),
      );
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

  if (fieldId === "temperature_cpu") {
    return `CPU ${formatted}`;
  }
  if (fieldId === "cpu_usage_percent") {
    return `CPU ${formatted}`;
  }
  if (fieldId === "mem_usage_percent") {
    return `RAM ${formatted}`;
  }
  if (fieldId === "temperature_memory") {
    return `RAM ${formatted}`;
  }
  if (fieldId === "temperature_gpu") {
    return `GPU ${formatted}`;
  }
  if (fieldId === "network_primary_upload_speed") {
    return `Up ${formatted}`;
  }
  if (fieldId === "network_primary_download_speed") {
    return `Down ${formatted}`;
  }
  if (fieldId === "network_primary_address") {
    return formatted;
  }

  return `${option.shortLabel} ${formatted}`;
}

export function hasCornerSensors(corners: TextBannerCorners): boolean {
  return Object.values(corners).some((fieldId) => fieldId !== "none");
}

export const DEFAULT_TEXT_BANNER_CORNERS: TextBannerCorners = {
  topLeft: "none",
  topRight: "none",
  bottomLeft: "none",
  bottomRight: "none",
};

export const BANNER_CORNER_LABELS: Record<BannerCorner, string> = {
  topLeft: "Top left",
  topRight: "Top right",
  bottomLeft: "Bottom left",
  bottomRight: "Bottom right",
};
