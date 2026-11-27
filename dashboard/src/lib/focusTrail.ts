import type { JourneyResult } from '../types';

export interface FocusTrailStop {
  position: number;
  total: number;
  hint: string;
  label: string;
  role: string | null;
  name: string;
  replicaId: string | null;
}

export interface StopEntry {
  key: string;
  label: string;
  replicaId: string | null;
}

export const STOP_TABLE: readonly StopEntry[] = [
  { key: '#recipient', label: 'Recipient', replicaId: 'pm-recipient' },
  { key: '#amount', label: 'Amount', replicaId: 'pm-amount' },
  { key: '#reference', label: 'Reference', replicaId: 'pm-reference' },
  { key: '#send-payment', label: 'Send Payment', replicaId: 'pm-send-payment' },
  { key: 'a.skip', label: 'Skip link', replicaId: null },
  { key: '#nav-dashboard', label: 'Dashboard link', replicaId: null },
  { key: '#nav-accounts', label: 'Accounts link', replicaId: null },
  { key: '#nav-transactions', label: 'Transactions link', replicaId: null },
  { key: '#nav-offer', label: 'Offer link', replicaId: null },
  { key: '#cancel', label: 'Cancel', replicaId: null },
  { key: '#offer-terms', label: 'Offer terms', replicaId: null },
  { key: '#privacy', label: 'Privacy', replicaId: null },
];

function matchesKey(hint: string, key: string): boolean {
  if (hint === key) return true;
  if (!hint.endsWith(key)) return false;
  if (key.startsWith('#')) return true;
  const idx = hint.length - key.length;
  return idx === 0 || /[\s>~+]/.test(hint[idx - 1]);
}

function matchStop(hint: string): StopEntry | undefined {
  return STOP_TABLE.find((entry) => matchesKey(hint, entry.key));
}

/** Pure extraction of ordered, deduplicated focus-trail stops from a JourneyResult. */
export function focusTrailStops(result: JourneyResult | null | undefined): FocusTrailStop[] {
  if (!result || typeof result !== 'object') return [];
  const trail = (result as { focus_trail?: unknown }).focus_trail;
  if (!Array.isArray(trail)) return [];

  const seen = new Set<string>();
  const retained: Omit<FocusTrailStop, 'position' | 'total'>[] = [];

  for (const item of trail) {
    if (!item || typeof item !== 'object') continue;
    const rawHint = (item as { selector_hint?: unknown }).selector_hint;
    if (typeof rawHint !== 'string') continue;
    const hint = rawHint.trim();
    if (!hint || hint === 'body') continue;
    if (seen.has(hint)) continue;
    seen.add(hint);

    const rawRole = (item as { role?: unknown }).role;
    const role = typeof rawRole === 'string' && rawRole.trim() ? rawRole.trim() : null;
    const rawName = (item as { accessible_name?: unknown }).accessible_name;
    const name = typeof rawName === 'string' ? rawName.trim() : '';

    const matched = matchStop(hint);
    retained.push({
      hint,
      label: matched?.label ?? (name || hint),
      role,
      name,
      replicaId: matched?.replicaId ?? null,
    });
  }

  const total = retained.length;
  return retained.map((stop, idx) => ({
    ...stop,
    position: idx + 1,
    total,
  }));
}

/** Plain-English description of a single focus trail stop, e.g. "Stop 3 of 9: Amount, text box". */
export function describeStop(stop: FocusTrailStop): string {
  const roleWord = stop.role === 'textbox' ? 'text box' : stop.role;
  const suffix = roleWord ? `, ${roleWord}` : '';
  return `Stop ${stop.position} of ${stop.total}: ${stop.label}${suffix}`;
}
