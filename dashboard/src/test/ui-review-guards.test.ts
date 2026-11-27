/// <reference types="vitest/globals" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

describe('ui-review guards', () => {
  it('no app file contains a typed barrier total', () => {
    const offenders = sourceFiles(SRC)
      .map((p) => relative(SRC, p).replace(/\\/g, '/'))
      .filter((p) => !p.startsWith('test/') && !p.startsWith('samples/') && !p.startsWith('generated/'))
      .filter((p) => {
        const text = readFileSync(join(SRC, p), 'utf8');
        return /\/\s*6\b|\bof 6\b|\$\{[^}]+\}\s*\/\s*\d+/.test(text);
      });
    expect(offenders).toEqual([]);
  });

  it('focus-trail files do not read typed values or bounding boxes', () => {
    const paths = [
      join(SRC, 'lib', 'focusTrail.ts'),
      join(SRC, 'components', 'journey', 'FocusTrailReplay.tsx'),
    ];
    for (const file of paths) {
      const text = readFileSync(file, 'utf8');
      for (const forbidden of ['runDetails', 'test_details', 'RecordedDetails', 'type_text', '.args', 'bounding_box']) {
        expect(text, file).not.toContain(forbidden);
      }
    }
  });
});
