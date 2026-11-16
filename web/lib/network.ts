import { readdir, readFile, stat } from "fs/promises";
import path from "path";

// With the /sys:/sys:ro bind mount, /sys/class/net shows the host's interfaces.
// With pid: host, /proc/1/net belongs to the host's network namespace.
const NET_ROOT = process.env.NET_SYSFS_ROOT || "/sys/class/net";
const HOST_PROC_NET = process.env.HOST_PROC_NET || "/proc/1/net";

const VIRTUAL_PREFIXES = [
  "lo",
  "veth",
  "docker",
  "br-",
  "virbr",
  "vnet",
  "tap",
  "tun",
  "kube",
  "cni",
  "flannel",
  "cali",
  "vb-",
];

const MIN_SAMPLE_MS = 800;

export interface NetworkInterfaceInfo {
  name: string;
  physical: boolean;
  isDefault: boolean;
  state: string;
  carrier: boolean;
  speedMbps: number | null;
  duplex: string | null;
  mtu: number | null;
  mac: string | null;
  ipv4: string[];
  rxBytes: number;
  txBytes: number;
  rxErrors: number;
  txErrors: number;
  rxDropped: number;
  txDropped: number;
  rxBytesPerSec: number | null;
  txBytesPerSec: number | null;
}

export interface NetworkSnapshot {
  interfaces: NetworkInterfaceInfo[];
  gateway: string | null;
  sampledAt: string;
}

interface CounterSample {
  rx: number;
  tx: number;
  at: number;
  rxRate: number | null;
  txRate: number | null;
}

const lastSamples = new Map<string, CounterSample>();

async function readText(filePath: string): Promise<string | null> {
  try {
    return (await readFile(filePath, "utf8")).trim();
  } catch {
    return null;
  }
}

async function readNumber(filePath: string): Promise<number | null> {
  const raw = await readText(filePath);
  if (raw === null) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? null : value;
}

async function isPhysical(name: string): Promise<boolean> {
  try {
    await stat(path.join(NET_ROOT, name, "device"));
    return true;
  } catch {
    return false;
  }
}

function hexToIpv4(hex: string): string {
  // /proc/net/route stores addresses as little-endian hex.
  const value = Number.parseInt(hex, 16);
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, value >>> 24].join(".");
}

function ipv4ToNumber(address: string): number {
  return address
    .split(".")
    .reduce((sum, part) => sum * 256 + Number.parseInt(part, 10), 0);
}

interface RouteEntry {
  iface: string;
  destination: number;
  mask: number;
  gateway: string;
}

async function readRoutes(): Promise<RouteEntry[]> {
  const raw = await readText(path.join(HOST_PROC_NET, "route"));
  if (!raw) return [];

  return raw
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((columns) => columns.length >= 8)
    .map((columns) => ({
      iface: columns[0],
      destination: ipv4ToNumber(hexToIpv4(columns[1])),
      gateway: hexToIpv4(columns[2]),
      mask: ipv4ToNumber(hexToIpv4(columns[7])),
    }));
}

async function readLocalAddresses(): Promise<string[]> {
  const raw = await readText(path.join(HOST_PROC_NET, "fib_trie"));
  if (!raw) return [];

  const addresses = new Set<string>();
  const lines = raw.split("\n");

  for (let index = 1; index < lines.length; index += 1) {
    if (!/\/32 host LOCAL/.test(lines[index])) continue;
    const match = lines[index - 1].match(/\|--\s+(\d+\.\d+\.\d+\.\d+)/);
    if (match && !match[1].startsWith("127.")) {
      addresses.add(match[1]);
    }
  }

  return [...addresses];
}

function assignAddresses(
  addresses: string[],
  routes: RouteEntry[],
): Map<string, string[]> {
  const byInterface = new Map<string, string[]>();

  for (const address of addresses) {
    const numeric = ipv4ToNumber(address);
    const route = routes
      .filter(
        (entry) =>
          entry.mask !== 0 &&
          ((numeric & entry.mask) >>> 0) === entry.destination,
      )
      .sort((left, right) => right.mask - left.mask)[0];

    if (!route) continue;
    const list = byInterface.get(route.iface) ?? [];
    list.push(address);
    byInterface.set(route.iface, list);
  }

  return byInterface;
}

function updateRates(name: string, rx: number, tx: number, now: number) {
  const previous = lastSamples.get(name);

  if (previous && now - previous.at < MIN_SAMPLE_MS) {
    return { rxRate: previous.rxRate, txRate: previous.txRate };
  }

  let rxRate: number | null = null;
  let txRate: number | null = null;

  if (previous && rx >= previous.rx && tx >= previous.tx) {
    const seconds = (now - previous.at) / 1000;
    rxRate = (rx - previous.rx) / seconds;
    txRate = (tx - previous.tx) / seconds;
  }

  lastSamples.set(name, { rx, tx, at: now, rxRate, txRate });
  return { rxRate, txRate };
}

export async function readNetworkSnapshot(): Promise<NetworkSnapshot> {
  let names: string[] = [];

  try {
    names = await readdir(NET_ROOT);
  } catch {
    names = [];
  }

  const [routes, localAddresses] = await Promise.all([
    readRoutes(),
    readLocalAddresses(),
  ]);
  const defaultRoute = routes.find((entry) => entry.mask === 0 && entry.destination === 0);
  const addressesByInterface = assignAddresses(localAddresses, routes);
  const now = Date.now();
  const interfaces: NetworkInterfaceInfo[] = [];

  for (const name of names.sort()) {
    const physical = await isPhysical(name);
    const ipv4 = addressesByInterface.get(name) ?? [];
    const isDefault = defaultRoute?.iface === name;
    const virtual = VIRTUAL_PREFIXES.some((prefix) => name.startsWith(prefix));

    // Physical NICs, plus bridges/bonds that carry the host address.
    if (!physical && (virtual || (ipv4.length === 0 && !isDefault))) {
      continue;
    }

    const base = path.join(NET_ROOT, name);
    const statsDir = path.join(base, "statistics");
    const [
      state,
      carrier,
      speed,
      duplex,
      mtu,
      mac,
      rxBytes,
      txBytes,
      rxErrors,
      txErrors,
      rxDropped,
      txDropped,
    ] = await Promise.all([
      readText(path.join(base, "operstate")),
      readNumber(path.join(base, "carrier")),
      readNumber(path.join(base, "speed")),
      readText(path.join(base, "duplex")),
      readNumber(path.join(base, "mtu")),
      readText(path.join(base, "address")),
      readNumber(path.join(statsDir, "rx_bytes")),
      readNumber(path.join(statsDir, "tx_bytes")),
      readNumber(path.join(statsDir, "rx_errors")),
      readNumber(path.join(statsDir, "tx_errors")),
      readNumber(path.join(statsDir, "rx_dropped")),
      readNumber(path.join(statsDir, "tx_dropped")),
    ]);

    const { rxRate, txRate } = updateRates(name, rxBytes ?? 0, txBytes ?? 0, now);

    interfaces.push({
      name,
      physical,
      isDefault,
      state: state ?? "unknown",
      carrier: carrier === 1,
      speedMbps: speed !== null && speed > 0 ? speed : null,
      duplex: duplex && duplex !== "unknown" ? duplex : null,
      mtu,
      mac,
      ipv4,
      rxBytes: rxBytes ?? 0,
      txBytes: txBytes ?? 0,
      rxErrors: rxErrors ?? 0,
      txErrors: txErrors ?? 0,
      rxDropped: rxDropped ?? 0,
      txDropped: txDropped ?? 0,
      rxBytesPerSec: rxRate,
      txBytesPerSec: txRate,
    });
  }

  interfaces.sort((left, right) => {
    if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
    if (left.carrier !== right.carrier) return left.carrier ? -1 : 1;
    return left.name.localeCompare(right.name);
  });

  return {
    interfaces,
    gateway: defaultRoute ? defaultRoute.gateway : null,
    sampledAt: new Date(now).toISOString(),
  };
}
