import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react';
import { type PageId, page, to } from '../../routes';

export interface SpotlightStep {
  /** Comma-separated CSS selectors; first visible match is spotlighted. */
  targetSelector: string;
  badge: string;
  title: string;
  description: string;
  placement?: 'bottom' | 'top' | 'right' | 'left';
}

const PAGE_TOURS: Partial<Record<PageId, SpotlightStep[]>> = {
  home: [
    {
      targetSelector: '#hero-heading',
      badge: 'Welcome',
      title: 'Haunted Audit — Accessibility Guardrail',
      description:
        'This is the starting point. Haunted Audit tests whether keyboard-only and voice-control users can finish real multi-step flows without touching a mouse.',
      placement: 'bottom',
    },
    {
      targetSelector: '#tour-cta-possess',
      badge: 'Step 1 · Experience',
      title: 'Launch Possession Mode',
      description:
        'Click "Possess This App" to jump straight into the workspace, enter test payment details, and watch an automated runner navigate Haunted Bank step by step.',
      placement: 'bottom',
    },
    {
      targetSelector: '#tour-pipeline',
      badge: 'Step 2 · Pipeline',
      title: 'Detect · Fix · Verify · Prevent',
      description:
        'AI agents explore the page and draft minimal code patches, while deterministic Playwright checks judge outcomes and require human approval.',
      placement: 'top',
    },
    {
      targetSelector: '#tour-nav-links',
      badge: 'Step 3 · Navigation',
      title: 'Explore Documentation & Workspace',
      description:
        'Switch between "How it works" to understand the 5 stages or open "App" for Journeys, Agents, Fixes, Reports, and Settings.',
      placement: 'bottom',
    },
    {
      targetSelector: '#tour-top-controls',
      badge: 'Step 4 · Controls',
      title: 'Halloween Audio & Kiro Integration',
      description:
        'Turn subtle underground Halloween sound on or off with the speaker button, or click Kiro to inspect how specs and hooks guard code quality.',
      placement: 'bottom',
    },
  ],
  'how-it-works': [
    {
      targetSelector: '[data-page-title]',
      badge: 'Overview',
      title: 'The 5-Stage Guardrail Loop',
      description:
        'Haunted Audit goes beyond static DOM scanners by simulating real keyboard and voice journeys from start to finish before allowing code merges.',
      placement: 'bottom',
    },
    {
      targetSelector: '#how-it-works h2',
      badge: 'Stage Cards',
      title: 'From Detection to Prevention',
      description:
        'Each stage card walks through how Haunted Audit discovers trapped elements, demonstrates the experience, prepares unified diffs on isolated copies, and re-tests.',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="What happens next"]',
      badge: 'Next Action',
      title: 'Try It Live in Possession Mode',
      description:
        'Ready to see a barrier happen in real time? Use the Next Step banner here to launch Possession Mode on the Haunted Bank fixture.',
      placement: 'top',
    },
  ],
  results: [
    {
      targetSelector: '[data-page-title]',
      badge: 'Strict Honesty',
      title: 'Measured Results Only — Never Guessed',
      description:
        'Haunted Audit refuses to show fake placeholder scores. Every metric displays "--" and "not yet measured" until a real browser run finishes.',
      placement: 'bottom',
    },
    {
      targetSelector: '#results [aria-label="not yet measured"], #results section',
      badge: 'Telemetry Cards',
      title: 'Real-Run Barrier Counters',
      description:
        'Once you run a journey, these counters compare barriers detected against the planted bugs and display patch confirmation percentages.',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="What happens next"]',
      badge: 'Next Action',
      title: 'Open Detailed App Reports',
      description:
        'Proceed directly into App → Reports inside the workspace to inspect detailed Focus Trail replays and patched-copy evidence.',
      placement: 'top',
    },
  ],
  trust: [
    {
      targetSelector: '[data-page-title]',
      badge: 'Trust Model',
      title: 'Why Verdicts Stay Objective',
      description:
        'LLMs never invent scores or approve their own code. Deterministic checks evaluate DOM reachability and require human confirmation.',
      placement: 'bottom',
    },
    {
      targetSelector: '#trust h2',
      badge: 'Core Guarantees',
      title: 'Three Guardrail Pillars',
      description:
        'Deterministic verdicts, unmeasured honesty ("--" until run), and SHA-256 approved isolated diffs ensure safe, auditable accessibility fixes.',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="What happens next"]',
      badge: 'Next Action',
      title: 'Inspect Measured Results',
      description:
        'Continue to Results to view real-run metrics once an audit executes.',
      placement: 'top',
    },
  ],
  kiro: [
    {
      targetSelector: '[data-page-title]',
      badge: 'Built with Kiro',
      title: 'Specs, Steering Rules & Hooks',
      description:
        'This entire guardrail workflow is governed by Kiro specs (.kiro/specs), steering documents, and scan-on-save automation hooks.',
      placement: 'bottom',
    },
    {
      targetSelector: '#kiro h2',
      badge: 'Architecture',
      title: 'How Kiro Steers Every Change',
      description:
        'Inspect how steering constraints enforce WCAG 2.2 AA contrast, honest telemetry reporting, and deterministic regression tests.',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="What happens next"]',
      badge: 'Next Action',
      title: 'About Haunted Audit',
      description:
        'Continue to About to see why mouse-free journey verification matters and who Haunted Audit is built for.',
      placement: 'top',
    },
  ],
  about: [
    {
      targetSelector: '[data-page-title]',
      badge: 'About',
      title: 'Accessibility QA for AI-Built Apps',
      description:
        'Modern AI-generated interfaces often look clean visually while silently trapping keyboard-only and voice users on clickable divs.',
      placement: 'bottom',
    },
    {
      targetSelector: '#about h2',
      badge: 'Purpose',
      title: 'Why & Who It Helps',
      description:
        'Engineers, QA teams, and product owners use Haunted Audit to experience real navigation barriers firsthand and ship safe fixes.',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="What happens next"]',
      badge: 'Next Action',
      title: 'Read Accessibility Statement',
      description:
        'Review our WCAG 2.2 AA guarantees for keyboard navigation, text zoom, and reduced motion.',
      placement: 'top',
    },
  ],
  accessibility: [
    {
      targetSelector: '[data-page-title]',
      badge: 'WCAG 2.2 AA',
      title: 'Accessible by Design',
      description:
        'Every navigation link, drawer, focus ring, and tour control in this app is built to meet WCAG 2.2 AA standards.',
      placement: 'bottom',
    },
    {
      targetSelector: '#accessibility h2',
      badge: 'Commitments',
      title: 'Keyboard, Contrast, Calm Mode & Zoom',
      description:
        'Switch on High contrast, Calm mode, or 100%–150% text scaling anytime in App → Settings without losing layout clarity.',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="What happens next"]',
      badge: 'Next Action',
      title: 'Return Home',
      description:
        'Jump back to the start page when you are ready to launch a live journey.',
      placement: 'top',
    },
  ],
  'app-home': [
    {
      targetSelector: '[data-page-title]',
      badge: 'Workspace',
      title: 'Haunted Audit Dashboard Overview',
      description:
        'Welcome to your control center. From here you launch keyboard/voice audits, inspect trapped controls, review patches, and read reports.',
      placement: 'bottom',
    },
    {
      targetSelector: '#app-home a[href*="possession"]',
      badge: 'Quick Launch',
      title: 'Start in Possession Mode',
      description:
        'Use this primary action button anytime to run a live Send Payment journey on the bundled Haunted Bank test fixture.',
      placement: 'bottom',
    },
    {
      targetSelector: '#kpi-heading',
      badge: 'Telemetry',
      title: 'Honest Run Telemetry',
      description:
        'These KPI cards stay at "--" before running and update live once an audit completes with verdict, barriers found, and patch status.',
      placement: 'bottom',
    },
    {
      targetSelector: '#app-tools-heading',
      badge: 'Modules',
      title: 'Navigate All Workspace Tools',
      description:
        'Click any module card—or use the sticky sidebar (desktop), quick icon rail (tablet), or bottom dock (mobile)—to switch workflows.',
      placement: 'bottom',
    },
  ],
  'app-scans': [
    {
      targetSelector: '[data-page-title]',
      badge: 'Scanner',
      title: 'Public URL Scanning',
      description:
        'Inspect external web apps for accessibility issues with built-in read-only guardrails.',
      placement: 'bottom',
    },
    {
      targetSelector: '#app-scans h2',
      badge: 'Network Protection',
      title: 'Protected Against Private Network Targets',
      description:
        'Private IPs, loopback addresses, and cloud metadata endpoints are blocked automatically while scanning public URLs.',
      placement: 'bottom',
    },
    {
      targetSelector: '#app-scans a[href*="possession"]',
      badge: 'Run Today',
      title: 'Test on Haunted Bank Now',
      description:
        'While public URL scanning is queued, click here to run full accessibility journeys against the Haunted Bank test fixture.',
      placement: 'top',
    },
  ],
  'app-journeys': [
    {
      targetSelector: '[data-page-title]',
      badge: 'Journeys',
      title: 'Available User Journeys',
      description:
        'Journeys test complete tasks—not isolated single clicks—matching how real assistive technology users accomplish goals.',
      placement: 'bottom',
    },
    {
      targetSelector: '#journey-haunted-bank',
      badge: '9 Sandbox Domains',
      title: 'Pick Any Possession Scenario',
      description:
        'Test 9 bundled web workflows—from Haunted Bank and Phantom Checkout to Cursed Clinic and GhostHR—using Tab navigation or Voice commands.',
      placement: 'bottom',
    },
    {
      targetSelector: '#app-journeys a[href*="possession"]',
      badge: 'Launch',
      title: 'Enter Possession Mode',
      description:
        'Open the interactive Possession Mode runner to configure inputs and observe barriers live.',
      placement: 'top',
    },
  ],
  possession: [
    {
      targetSelector: '[data-page-title]',
      badge: 'Possession Mode',
      title: 'Live Mouse-Free Run Simulator',
      description:
        'Possession Mode runs a real Playwright session against Haunted Bank to expose exactly where keyboard focus or voice control gets stuck.',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="Breadcrumb"]',
      badge: 'Run Status',
      title: 'Live Breadcrumb & Status Pill',
      description:
        'Track whether the runner is idle ("Ready"), actively testing ("Live Test"), or finished ("Verified" / "Blocked").',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="Sandbox page links"]',
      badge: 'Sandbox Environment',
      title: 'Live Scenario Preview',
      description:
        'This replica mirrors the active Possession sandbox so you can follow where keyboard focus rests during the run.',
      placement: 'right',
    },
    {
      targetSelector: '#pm-send-payment',
      badge: 'Target Trap',
      title: 'Where Barriers Happen',
      description:
        'Watch interactive controls like the Send Payment action—if implemented as an inaccessible element, Tab skips straight past it and flags BLOCKED.',
      placement: 'top',
    },
    {
      targetSelector: 'nav[aria-label="What happens next"]',
      badge: 'Next Action',
      title: 'Inspect Agent Logs Next',
      description:
        'After a run finishes, step forward into Agents to review every keystroke, focus element, and barrier selector recorded.',
      placement: 'top',
    },
  ],
  'app-agents': [
    {
      targetSelector: '[data-page-title]',
      badge: 'Agents',
      title: 'Inspect Agent Execution Logs',
      description:
        'See how the Scripted keyboard runner, Bedrock LLM agent, or Voice simulation navigated Haunted Bank step by step.',
      placement: 'bottom',
    },
    {
      targetSelector: '#app-agents [role="status"], #app-agents h2',
      badge: 'Live Feed',
      title: 'Real-Time Step & Barrier Feed',
      description:
        'When idle, this status prompts you to run Possession Mode first. During or after a run, every Tab hop and trapped selector appears here.',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="What happens next"]',
      badge: 'Next Action',
      title: 'Move to Fix Pipeline → Find',
      description:
        'Proceed to Findings to examine the exact failing node and prepare an Exorcist diff proposal.',
      placement: 'top',
    },
  ],
  'app-fixes': [
    {
      targetSelector: '[data-page-title]',
      badge: 'Fixes',
      title: 'Possession Runs & Fix Pipeline',
      description:
        'Review every saved Possession run in a paginated table, then open View details to inspect Find, Fix, Verify, and Regression stages.',
      placement: 'bottom',
    },
    {
      targetSelector: '#possession-picker-heading',
      badge: 'Fix Tracker',
      title: 'Paginated Run Table',
      description:
        'Each row shows the tested scenario, verdict, trapped element selector, and repair stage saved in localStorage.',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="What happens next"]',
      badge: 'Next Action',
      title: 'Review Final Reports',
      description:
        'Once repairs and checks finish, inspect Reports for HeroUI metric charts and saved Possession history.',
      placement: 'top',
    },
  ],
  'app-reports': [
    {
      targetSelector: '[data-page-title]',
      badge: 'Reports',
      title: 'Measured Audit Reports & Charts',
      description:
        'Review real metrics and bar charts built from runs you executed—kept strictly honest as "--" whenever nothing has run yet.',
      placement: 'bottom',
    },
    {
      targetSelector: '#verifier-evidence-heading',
      badge: 'Evidence',
      title: 'Patched Copy Verifier Evidence',
      description:
        'Inspect keyboard and voice proof recorded on isolated patched fixture copies right below this heading.',
      placement: 'bottom',
    },
    {
      targetSelector: 'nav[aria-label="What happens next"]',
      badge: 'Next Action',
      title: 'Configure Settings Anytime',
      description:
        'Open Settings to adjust default runner mode, Halloween audio, Calm mode, and localStorage run tracking.',
      placement: 'top',
    },
  ],
  'app-settings': [
    {
      targetSelector: '[data-page-title]',
      badge: 'Settings',
      title: 'Customize Workspace & Diagnostics',
      description:
        'Configure default Possession Mode options, audio, motion, local storage persistence, and test backend API health.',
      placement: 'bottom',
    },
    {
      targetSelector: '[aria-label="Default bank variant"]',
      badge: 'Defaults',
      title: 'Default Runner & Bank Variant',
      description:
        'Set whether Possession Mode starts with Broken or Fixed Haunted Bank and Scripted vs Bedrock LLM engine.',
      placement: 'bottom',
    },
    {
      targetSelector: '[aria-label="Toggle underground Halloween sound"]',
      badge: 'Audio & Calm Mode',
      title: 'Halloween Sound & Reduced Motion',
      description:
        'Toggle the procedural Web Audio cavern soundtrack or pause flying ghosts cleanly with Calm mode.',
      placement: 'bottom',
    },
    {
      targetSelector: '[aria-label="Toggle saving Possession history locally"]',
      badge: 'Storage & Health',
      title: 'Possession Storage & Backend Ping',
      description:
        'Control browser run history retention, clear saved rounds back to "--", or run a live latency check against FastAPI.',
      placement: 'top',
    },
  ],
};

function getStepsForPage(pageId: PageId): SpotlightStep[] {
  const custom = PAGE_TOURS[pageId];
  if (custom && custom.length > 0) return custom;
  const def = page(pageId);
  return [
    {
      targetSelector: '[data-page-title]',
      badge: 'Page Guide',
      title: def.h1,
      description: def.shows,
      placement: 'bottom',
    },
  ];
}

function findVisibleTarget(selectorList: string): HTMLElement | null {
  const parts = selectorList.split(',').map((s) => s.trim()).filter(Boolean);
  for (const sel of parts) {
    try {
      const candidates = document.querySelectorAll(sel);
      for (const node of candidates) {
        const el = node as HTMLElement;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
    } catch {
      // Ignore invalid selector edge cases
    }
  }
  return null;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function computeNonOverlappingCardPos(
  rect: Rect | null,
  cardW: number,
  cardH: number,
  vw: number,
  vh: number,
  preferred: SpotlightStep['placement'],
): { top: number; left: number } {
  const gap = 16;
  const margin = 12;

  if (!rect) {
    return {
      top: Math.max(margin, Math.round((vh - cardH) / 2)),
      left: Math.max(margin, Math.round((vw - cardW) / 2)),
    };
  }

  const pad = 8;
  const spotTop = Math.max(4, rect.top - pad);
  const spotLeft = Math.max(4, rect.left - pad);
  const spotRight = Math.min(vw - 4, rect.left + rect.width + pad);
  const spotBottom = Math.min(vh - 4, rect.top + rect.height + pad);
  const spotCenterX = (spotLeft + spotRight) / 2;
  const spotCenterY = (spotTop + spotBottom) / 2;

  const centeredLeft = Math.min(Math.max(margin, spotCenterX - cardW / 2), vw - cardW - margin);
  const centeredTop = Math.min(Math.max(margin, spotCenterY - cardH / 2), vh - cardH - margin);

  const candidates: Record<'bottom' | 'top' | 'right' | 'left', { ok: boolean; top: number; left: number }> = {
    bottom: {
      ok: spotBottom + gap + cardH <= vh - margin,
      top: spotBottom + gap,
      left: centeredLeft,
    },
    top: {
      ok: spotTop - gap - cardH >= margin,
      top: spotTop - gap - cardH,
      left: centeredLeft,
    },
    right: {
      ok: spotRight + gap + cardW <= vw - margin,
      top: centeredTop,
      left: spotRight + gap,
    },
    left: {
      ok: spotLeft - gap - cardW >= margin,
      top: centeredTop,
      left: spotLeft - gap - cardW,
    },
  };

  const order: Array<'bottom' | 'top' | 'right' | 'left'> =
    preferred === 'top'
      ? ['top', 'bottom', 'right', 'left']
      : preferred === 'right'
        ? ['right', 'left', 'bottom', 'top']
        : preferred === 'left'
          ? ['left', 'right', 'bottom', 'top']
          : ['bottom', 'top', 'right', 'left'];

  for (const dir of order) {
    if (candidates[dir].ok) {
      return {
        top: Math.round(candidates[dir].top),
        left: Math.round(candidates[dir].left),
      };
    }
  }

  // Last resort: place in whichever vertical half has MORE free space outside target
  const spaceBelow = vh - spotBottom;
  const spaceAbove = spotTop;
  if (spaceBelow >= spaceAbove) {
    return { top: Math.min(vh - cardH - margin, Math.round(spotBottom + 8)), left: Math.round(centeredLeft) };
  }
  return { top: Math.max(margin, Math.round(spotTop - cardH - 8)), left: Math.round(centeredLeft) };
}

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  pageId?: PageId;
}

export function InteractiveTour({ isOpen, onClose, pageId = 'home' }: InteractiveTourProps) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardSize, setCardSize] = useState({ width: 360, height: 210 });
  const cardRef = useRef<HTMLDivElement>(null);

  const steps = getStepsForPage(pageId);
  const safeIdx = Math.min(idx, steps.length - 1);
  const step = steps[safeIdx];

  useEffect(() => {
    setIdx(0);
  }, [pageId, isOpen]);

  const measureTarget = useCallback(() => {
    if (!isOpen || !step) return;
    const el = findVisibleTarget(step.targetSelector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen || !step) return;
    const el = findVisibleTarget(step.targetSelector);
    if (el) {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Only scroll if element is outside the safe middle area of the viewport
      if (r.top < 72 || r.bottom > vh - 72) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    measureTarget();
    const t1 = window.setTimeout(measureTarget, 160);
    const t2 = window.setTimeout(measureTarget, 360);
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [isOpen, safeIdx, step, measureTarget]);

  useLayoutEffect(() => {
    if (!isOpen || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    if (r.height > 0 && (Math.abs(r.height - cardSize.height) > 2 || Math.abs(r.width - cardSize.width) > 2)) {
      setCardSize({ width: r.width, height: r.height });
    }
  }, [isOpen, safeIdx, pageId, cardSize.height, cardSize.width]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(steps.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, steps.length]);

  if (!isOpen || !step || typeof document === 'undefined') return null;

  const pad = 8;
  const spotTop = rect ? Math.max(4, rect.top - pad) : 0;
  const spotLeft = rect ? Math.max(4, rect.left - pad) : 0;
  const spotW = rect ? rect.width + pad * 2 : 0;
  const spotH = rect ? rect.height + pad * 2 : 0;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(380, vw - 24);
  const pos = computeNonOverlappingCardPos(rect, cardWidth, cardSize.height, vw, vh, step.placement);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-tour-title"
      className="fixed inset-0 z-[80]"
    >
      {/* Click-outside close catcher: transparent over the whole screen so spotlighted element is NEVER blurred or darkened */}
      <div
        className={rect ? 'fixed inset-0 bg-transparent' : 'fixed inset-0 bg-black/75'}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Crisp cutout ring: darkens ONLY outside the spotlight hole so focused item stays 100% razor sharp */}
      {rect && (
        <div
          aria-hidden="true"
          data-testid="tour-spotlight"
          className="pointer-events-none fixed rounded-2xl border-2 border-violet-neon shadow-[0_0_0_9999px_rgba(6,3,12,0.78),0_0_24px_4px_rgba(168,85,247,0.75)] transition-all duration-200"
          style={{ top: spotTop, left: spotLeft, width: spotW, height: spotH }}
        />
      )}

      {/* Collision-free floating tour popover */}
      <div
        ref={cardRef}
        data-testid="tour-popover"
        className="fixed z-[85] rounded-2xl bg-[#160b29] p-5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(168,85,247,0.35)] transition-all duration-200"
        style={{ top: pos.top, left: pos.left, width: cardWidth }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <Chip size="sm" variant="flat" color="secondary" startContent={<Compass size={13} aria-hidden="true" />}>
            {step.badge}
          </Chip>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close live tour"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-base-surface hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <h2 id="live-tour-title" className="m-0 text-lg font-bold font-ui text-white">
          {step.title}
        </h2>
        <p className="mt-1.5 mb-4 text-sm leading-relaxed text-ink-muted" aria-live="polite">
          {step.description}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink-faint">
            Step {safeIdx + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="flat"
              isDisabled={safeIdx === 0}
              onPress={() => setIdx((i) => Math.max(0, i - 1))}
              startContent={<ArrowLeft size={14} aria-hidden="true" />}
              className="bg-base-surface/70 text-white"
            >
              Back
            </Button>
            {safeIdx < steps.length - 1 ? (
              <Button
                type="button"
                size="sm"
                color="secondary"
                onPress={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
                endContent={<ArrowRight size={14} aria-hidden="true" />}
                className="bg-violet-600 font-semibold text-white"
              >
                Next
              </Button>
            ) : pageId === 'home' ? (
              <Button
                as={Link}
                to={to('possession')}
                size="sm"
                color="secondary"
                onPress={onClose}
                className="bg-violet-600 font-semibold text-white"
              >
                Try Possession Mode
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                color="secondary"
                onPress={onClose}
                className="bg-violet-600 font-semibold text-white"
              >
                Finish Tour
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
