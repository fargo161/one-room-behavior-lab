const cleanSegment = (value: string | number): string => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

export function stableRuntimeId(prefix: string, ...segments: Array<string | number>): string {
  const cleaned = [prefix, ...segments].map(cleanSegment).filter(Boolean).join("_");
  if (!/^[a-z]/.test(cleaned)) return `id_${cleaned}`;
  return cleaned;
}

export const unsignedSeedLabel = (seed: number): string => (seed >>> 0).toString(36);
