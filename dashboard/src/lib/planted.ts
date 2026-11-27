import rawPlanted from '../generated/planted.json';

/** Validate a planted.json payload and return a positive integer total, or null. */
export function parsePlantedTotal(json: unknown): number | null {
  if (!json || typeof json !== 'object') return null;
  const total = (json as { total?: unknown }).total;
  if (typeof total !== 'number' || !Number.isInteger(total) || total <= 0) return null;
  return total;
}

/** Total planted barriers exported from bank/PLANTED.md, or null if invalid. */
export function plantedTotal(): number | null {
  return parsePlantedTotal(rawPlanted);
}
