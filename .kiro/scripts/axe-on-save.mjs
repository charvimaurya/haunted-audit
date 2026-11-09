#!/usr/bin/env node
/**
 * axe-on-save.mjs
 *
 * Called by the PostFileSave hook. Reads Kiro's session JSON from stdin,
 * maps the saved file to a dev-server URL, runs axe-core via Playwright,
 * and prints a structured violation report.
 *
 * Output contract:
 *   - Exit 0 always (violations are findings, not script errors).
 *   - Stdout: human-readable report that the Kiro agent presents to the user.
 *   - No code is changed. No fixes are applied automatically.
 *
 * Dependencies (installed automatically on first run if missing):
 *   @playwright/test, @axe-core/playwright
 *
 * Dev server assumption: Vite runs on http://localhost:5173.
 * Override with env var AXE_DEV_SERVER_URL.
 */

import { execSync, spawnSync } from 'node:child_process';
import { createRequire }       from 'node:module';
import { join, resolve }       from 'node:path';
import { readFileSync }        from 'node:fs';

// ── 0. Read stdin (Kiro hook payload) ────────────────────────────────────────

let payload = {};
try {
  const raw = readFileSync('/dev/stdin', 'utf8').trim();
  if (raw) payload = JSON.parse(raw);
} catch {
  // stdin may be empty in manual invocation; that's fine
}

// The saved file path comes from the hook context.
// Kiro PostFileSave passes: { file: { path: string } }
const savedFile = payload?.file?.path ?? payload?.filePath ?? '';

// ── 1. Resolve workspace root ─────────────────────────────────────────────────

// This script lives at .kiro/scripts/axe-on-save.mjs
const SCRIPT_DIR  = new URL('.', import.meta.url).pathname;
const WORKSPACE   = resolve(SCRIPT_DIR, '..', '..');        // project root
const DASHBOARD   = join(WORKSPACE, 'dashboard');

// ── 2. Map the saved file to one or more dev-server routes ───────────────────

const DEV_SERVER  = process.env.AXE_DEV_SERVER_URL ?? 'http://localhost:5173';

/**
 * Component-to-route map.
 * Each entry: filename substring → array of routes to audit.
 * A file that doesn't match any entry audits the root route.
 */
const ROUTE_MAP = [
  // Layout / global — check every primary route
  { match: /TopNav|layout|globals\.css|tailwind\.config/i,
    routes: ['/', '#scans', '#journeys', '#fixes', '#kiro', '#reports'] },

  // Hero / landing
  { match: /HeroSection|page\.tsx/i,
    routes: ['/'] },

  // Possession Mode
  { match: /PossessionMode|ChecklistItem|GhostOverlay/i,
    routes: ['/#journeys'] },

  // Agent investigation
  { match: /AgentCard|GhostHuntSection|LiveTimeline|StepEventRow/i,
    routes: ['/#scans'] },

  // Fix pipeline
  { match: /PipelineSection|CodeBlock|CodeDiff|FindPanel|FixPanel|VerifyPanel|RegressionPanel/i,
    routes: ['/#fixes'] },

  // Kiro integration
  { match: /KiroIntegration|FileTree|HookCode|HookEvent/i,
    routes: ['/#kiro'] },

  // Reports / metrics
  { match: /ResultsSection|OutcomeCard|MetricValue|MetricTile/i,
    routes: ['/#reports'] },

  // Ghost — any ghost change audits everything
  { match: /GhostMascot|GhostSVG|GhostPositioned/i,
    routes: ['/'] },

  // RunControls — landing
  { match: /RunControls/i,
    routes: ['/'] },

  // index.css / globals — check all
  { match: /index\.css|globals\.css/i,
    routes: ['/', '/#scans', '/#journeys', '/#fixes', '/#kiro', '/#reports'] },
];

function routesForFile(filePath) {
  if (!filePath) return ['/'];
  const basename = filePath.split('/').pop() ?? filePath;
  for (const entry of ROUTE_MAP) {
    if (entry.match.test(basename) || entry.match.test(filePath)) {
      return entry.routes;
    }
  }
  // Default: audit root
  return ['/'];
}

const targetRoutes = routesForFile(savedFile);
const uniqueRoutes = [...new Set(targetRoutes)];

// ── 3. Ensure @playwright/test and @axe-core/playwright are installed ─────────

const require = createRequire(import.meta.url);

function isInstalled(pkg) {
  try { require.resolve(pkg, { paths: [DASHBOARD] }); return true; } catch { return false; }
}

if (!isInstalled('@playwright/test') || !isInstalled('@axe-core/playwright')) {
  console.log('⚙️  Installing Playwright + @axe-core/playwright (first run only)…');
  spawnSync(
    'npm', ['install', '--save-dev',
      '@playwright/test@1.44.1',
      '@axe-core/playwright@4.9.1',
    ],
    { cwd: DASHBOARD, stdio: 'inherit', shell: true },
  );
  // Install Chromium
  spawnSync(
    'npx', ['playwright', 'install', 'chromium', '--with-deps'],
    { cwd: DASHBOARD, stdio: 'inherit', shell: true },
  );
}

// ── 4. Check the dev server is running ────────────────────────────────────────

async function isServerUp(url) {
  try {
    const { default: http } = await import(url.startsWith('https') ? 'node:https' : 'node:http');
    return await new Promise((resolve) => {
      const req = http.get(url, (res) => { res.resume(); resolve(res.statusCode < 500); });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
  } catch { return false; }
}

const serverUp = await isServerUp(DEV_SERVER);
if (!serverUp) {
  console.log(`\n⚠️  Dev server not detected at ${DEV_SERVER}`);
  console.log('   Start it with:  cd dashboard && npm run dev');
  console.log('   Then save the file again to trigger the axe scan.\n');
  process.exit(0);
}

// ── 5. Run axe-core via Playwright ────────────────────────────────────────────

/**
 * WCAG success criterion short-codes.
 * axe-core rule IDs → WCAG SC numbers + levels.
 * Not exhaustive; covers the most common violations.
 */
const WCAG_MAP = {
  'color-contrast':             'WCAG 1.4.3 AA — Contrast (Minimum)',
  'color-contrast-enhanced':    'WCAG 1.4.6 AAA — Contrast (Enhanced)',
  'document-title':             'WCAG 2.4.2 A — Page Titled',
  'html-has-lang':              'WCAG 3.1.1 A — Language of Page',
  'image-alt':                  'WCAG 1.1.1 A — Non-text Content',
  'label':                      'WCAG 1.3.1 A — Info and Relationships / 4.1.2 A — Name, Role, Value',
  'landmark-one-main':          'WCAG 1.3.6 A — Identify Purpose',
  'link-name':                  'WCAG 4.1.2 A — Name, Role, Value / 2.4.4 A — Link Purpose',
  'button-name':                'WCAG 4.1.2 A — Name, Role, Value',
  'aria-allowed-attr':          'WCAG 4.1.2 A — Name, Role, Value',
  'aria-required-attr':         'WCAG 4.1.2 A — Name, Role, Value',
  'aria-roles':                 'WCAG 4.1.2 A — Name, Role, Value',
  'aria-hidden-focus':          'WCAG 4.1.2 A — Name, Role, Value',
  'aria-valid-attr':            'WCAG 4.1.2 A — Name, Role, Value',
  'aria-valid-attr-value':      'WCAG 4.1.2 A — Name, Role, Value',
  'tabindex':                   'WCAG 2.4.3 A — Focus Order',
  'focus-trap':                 'WCAG 2.1.2 A — No Keyboard Trap',
  'keyboard':                   'WCAG 2.1.1 A — Keyboard',
  'skip-link':                  'WCAG 2.4.1 A — Bypass Blocks',
  'scrollable-region-focusable':'WCAG 2.1.1 A — Keyboard',
  'list':                       'WCAG 1.3.1 A — Info and Relationships',
  'listitem':                   'WCAG 1.3.1 A — Info and Relationships',
  'heading-order':              'WCAG 1.3.1 A — Info and Relationships',
  'duplicate-id-active':        'WCAG 4.1.1 A — Parsing',
  'duplicate-id-aria':          'WCAG 4.1.1 A — Parsing',
  'frame-title':                'WCAG 4.1.2 A — Name, Role, Value',
  'meta-viewport':              'WCAG 1.4.4 AA — Resize Text',
  'td-headers-attr':            'WCAG 1.3.1 A — Info and Relationships',
  'th-has-data-cells':          'WCAG 1.3.1 A — Info and Relationships',
};

function wcagFor(ruleId) {
  return WCAG_MAP[ruleId] ?? `WCAG — see https://dequeuniversity.com/rules/axe/4.9/${ruleId}`;
}

/**
 * Suggest a fix based on the rule ID and the violation's help text.
 * These are starting-point suggestions only; a human must review.
 */
function suggestFix(ruleId, helpUrl, nodes) {
  const FIXES = {
    'color-contrast':
      'Increase the foreground/background colour contrast ratio to at least 4.5:1 for normal text or 3:1 for large text (≥18pt or ≥14pt bold). Check the current ratio with the Chrome DevTools Accessibility panel.',
    'image-alt':
      'Add a descriptive alt attribute to the <img>. If the image is decorative, use alt="".',
    'label':
      'Associate a <label htmlFor="..."> with every form control, or add aria-label / aria-labelledby directly to the control.',
    'button-name':
      'Add visible text content or an aria-label to the button.',
    'link-name':
      'Add visible text content or an aria-label to the anchor. If the link contains only an icon, add aria-label describing the destination.',
    'tabindex':
      'Remove positive tabindex values. Use tabindex="0" to add an element to natural tab order, tabindex="-1" for programmatic focus only.',
    'aria-hidden-focus':
      'Remove aria-hidden from elements that contain focusable children, or move the focusable children outside the aria-hidden subtree.',
    'scrollable-region-focusable':
      'Add tabindex="0" to scrollable regions that do not contain focusable descendants.',
    'skip-link':
      'Add a skip-to-main-content link as the first focusable element. Target the <main id="main-content"> element with tabIndex={-1}.',
    'heading-order':
      'Ensure heading levels are not skipped (e.g. h1 → h3 without an h2). Use headings to convey document structure, not visual styling.',
    'list':
      'Only <li>, <script>, and <template> elements should be direct children of <ul> or <ol>.',
    'listitem':
      '<li> elements must be contained within a <ul> or <ol> parent.',
    'duplicate-id-active':
      'Ensure every id attribute value is unique within the page.',
    'duplicate-id-aria':
      'The id referenced by an ARIA attribute must be unique. Duplicate IDs break the association.',
    'landmark-one-main':
      'Ensure the page contains exactly one <main> landmark. Every page route must have a <main id="main-content" tabIndex={-1}>.',
    'aria-allowed-attr':
      'Remove ARIA attributes that are not permitted on this role. Check the ARIA spec for allowed attributes per role.',
    'aria-required-attr':
      'Add the missing required ARIA attribute listed in the violation details.',
    'aria-roles':
      'Use a valid ARIA role value. Check https://www.w3.org/TR/wai-aria/#role_definitions for the full list.',
    'frame-title':
      'Add a title attribute to every <iframe> describing its content.',
    'meta-viewport':
      'Remove user-scalable=no and maximum-scale<1 from the <meta name="viewport"> tag. Users must be able to zoom to 200%.',
  };
  return FIXES[ruleId]
    ?? `Review the axe rule documentation: ${helpUrl}`;
}

// Playwright inline script
const playwrightScript = `
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const DEV_SERVER = process.argv[2];
const routesArg  = process.argv[3];          // JSON-encoded array
const routes     = JSON.parse(routesArg);

const AXE_TAGS = ['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice'];

const browser = await chromium.launch({ headless: true });
const results = {};

for (const route of routes) {
  const url    = DEV_SERVER + route;
  const page   = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});

  // Wait for any React hydration
  await page.waitForTimeout(600);

  const scan = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .analyze()
    .catch(err => ({ violations: [], error: err.message }));

  results[route] = {
    url,
    violations: scan.violations ?? [],
    error:      scan.error ?? null,
  };

  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
`;

import { writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const tmpDir    = mkdtempSync(join(tmpdir(), 'axe-on-save-'));
const scriptPath = join(tmpDir, 'run-axe.mjs');
writeFileSync(scriptPath, playwrightScript);

let scanResults = {};
try {
  const result = spawnSync(
    'node', [scriptPath, DEV_SERVER, JSON.stringify(uniqueRoutes)],
    {
      cwd:      DASHBOARD,
      timeout:  60_000,    // 60 s total; each page has 15 s
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '' },
    },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.stderr && result.stderr.trim()) {
    // Playwright emits non-fatal warnings to stderr; only error if stdout is empty
    if (!result.stdout?.trim()) {
      throw new Error(result.stderr.trim());
    }
  }
  scanResults = JSON.parse(result.stdout ?? '{}');
} catch (err) {
  console.log(`\n❌  axe scan failed: ${err.message}\n`);
  process.exit(0);
} finally {
  try { unlinkSync(scriptPath); } catch {}
  try { require('node:fs').rmdirSync(tmpDir); } catch {}
}

// ── 6. Format and print the report ───────────────────────────────────────────

const savedName = savedFile ? savedFile.split('/').pop() : '(unknown)';
const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });

console.log('');
console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log(`║  🔍  Haunted Audit — axe-core scan                              ║`);
console.log(`║  File saved:  ${savedName.padEnd(51)}║`);
console.log(`║  Time:        ${timestamp.padEnd(51)}║`);
console.log('╚══════════════════════════════════════════════════════════════════╝');

let totalViolations = 0;
let totalRoutes     = 0;

for (const [route, data] of Object.entries(scanResults)) {
  totalRoutes++;
  const { url, violations, error } = data;

  if (error) {
    console.log(`\n⚠️  Route ${route} — scan error: ${error}`);
    continue;
  }

  if (violations.length === 0) {
    console.log(`\n✅  ${route} — No violations`);
    continue;
  }

  totalViolations += violations.length;
  console.log(`\n🚨  ${route} — ${violations.length} violation${violations.length === 1 ? '' : 's'}`);
  console.log(`    URL: ${url}`);

  for (let i = 0; i < violations.length; i++) {
    const v = violations[i];
    const wcag    = wcagFor(v.id);
    const suggest = suggestFix(v.id, v.helpUrl, v.nodes);

    console.log('');
    console.log(`  ── Violation ${i + 1} of ${violations.length} ──────────────────────────────────`);
    console.log(`  Rule ID:       ${v.id}`);
    console.log(`  Impact:        ${v.impact ?? 'unknown'}`);
    console.log(`  WCAG:          ${wcag}`);
    console.log(`  Description:   ${v.description}`);

    // Affected elements (up to 3)
    const nodeList = v.nodes.slice(0, 3);
    console.log(`  Elements (${v.nodes.length} affected${v.nodes.length > 3 ? ', showing first 3' : ''}):`);
    for (const node of nodeList) {
      const selector = node.target?.join(' > ') ?? node.html?.slice(0, 80) ?? '(unknown)';
      const snippet  = node.html?.replace(/\s+/g, ' ').trim().slice(0, 120) ?? '';
      console.log(`    • ${selector}`);
      if (snippet) console.log(`      ${snippet}`);
      if (node.failureSummary) {
        // Format the failure summary: strip "Fix any of the following:" prefix
        const summary = node.failureSummary
          .replace(/^Fix (any|all) of the following:\s*/i, '')
          .split('\n')
          .map(l => `      ${l.trim()}`)
          .filter(l => l.trim())
          .join('\n');
        console.log(`      Failure: ${summary.trim()}`);
      }
    }

    console.log(`  Suggested fix:`);
    // Wrap suggestion at ~72 chars
    const words   = suggest.split(' ');
    let   line    = '    ';
    for (const word of words) {
      if ((line + word).length > 76) {
        console.log(line);
        line = `    ${word} `;
      } else {
        line += `${word} `;
      }
    }
    if (line.trim()) console.log(line);

    console.log(`  More info:     ${v.helpUrl}`);
  }
}

// ── 7. Summary ────────────────────────────────────────────────────────────────

console.log('');
console.log('════════════════════════════════════════════════════════════════════');
if (totalViolations === 0) {
  console.log(`✅  All ${totalRoutes} route(s) passed axe WCAG 2.1 AA scan.`);
  console.log('   Note: automated axe covers ~30–40% of WCAG issues.');
  console.log('   Manual testing with assistive technology is also required.');
} else {
  console.log(`🚨  ${totalViolations} violation(s) found across ${totalRoutes} route(s).`);
  console.log('');
  console.log('   ⚑  No code has been changed automatically.');
  console.log('   Review each finding above, then tell me which fix to apply.');
  console.log('   I will make exactly the change you approve, nothing else.');
}
console.log('════════════════════════════════════════════════════════════════════');
console.log('');
