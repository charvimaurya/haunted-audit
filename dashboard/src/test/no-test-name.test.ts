/// <reference types="node" />
/**
 * user-typed-test-details REQ-TD-10: no test person's name ships in the dashboard.
 * Scans every file under dashboard/src and dashboard/public. The built bundle is scanned by
 * scripts/check_bundle_names.mjs after `npm run build` (CI runs both).
 * The name is built from parts so this file does not contain it.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const NAME = ['Alex', 'Carter'].join(' ');
const ROOT = join(__dirname, '..', '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe('no test person name in the dashboard', () => {
  it.each(['src', 'public'])('dashboard/%s has none', (dir) => {
    const hits = files(join(ROOT, dir)).filter((f) => readFileSync(f).toString('latin1').toLowerCase().includes(NAME.toLowerCase()));
    expect(hits).toEqual([]);
  });
});
