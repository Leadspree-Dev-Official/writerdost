import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent } from "undici";

const BLOCKED_RANGES = new Set([
  "unspecified",
  "broadcast",
  "multicast",
  "loopback",
  "linkLocal",
  "private",
  "uniqueLocal",
  "carrierGradeNat",
  "reserved",
  "benchmarking",
  "documentation",
  "as112",
]);

export function normalizeHost(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

type ParsedAddress = ReturnType<typeof ipaddr.parse>;

function parseAddress(address: string): ParsedAddress | null {
  try {
    const parsed = ipaddr.parse(address);
    if (parsed.kind() === "ipv6") {
      const v6 = parsed as unknown as {
        isIPv4MappedAddress(): boolean;
        toIPv4Address(): ParsedAddress;
      };
      if (v6.isIPv4MappedAddress()) return v6.toIPv4Address();
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isPublicAddress(address: string): boolean {
  if (!isIP(address)) return false;
  const parsed = parseAddress(address);
  return parsed ? !BLOCKED_RANGES.has(parsed.range()) : false;
}

export function isLoopbackAddress(address: string): boolean {
  const parsed = parseAddress(address);
  return parsed ? parsed.range() === "loopback" : false;
}

export function pinnedAgent(address: string): Agent {
  const family = isIP(address) === 6 ? 6 : 4;
  return new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => callback(null, address, family),
    },
  });
}
