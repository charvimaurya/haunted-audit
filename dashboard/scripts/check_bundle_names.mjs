// user-typed-test-details REQ-TD-10: fail if a test person's name is in the built bundle.
// Run after `npm run build`:  node scripts/check_bundle_names.mjs
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const NAME = ['Alex', 'Carter'].join(' ').toLowerCase();
const DIST = new URL('../dist', import.meta.url).pathname;
if (!existsSync(DIST)) {
  console.error('No dist/ folder. Run npm run build first.');
  process.exit(2);
}
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const hits = walk(DIST).filter((f) => readFileSync(f).toString('latin1').toLowerCase().includes(NAME));
if (hits.length) {
  console.error(`Test person name found in the bundle:\n${hits.join('\n')}`);
  process.exit(1);
}
console.log(`No test person name in ${walk(DIST).length} bundle files.`);
