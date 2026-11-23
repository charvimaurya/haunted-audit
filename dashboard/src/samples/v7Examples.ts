/**
 * Sample values copied from the v7 design image (design/Haunted_Audit_Final_UI_v7.png).
 * NOT results. Tests and design notes only. App code must never import this folder:
 * the production build fails if it does (vite.config.ts, noSamplesInApp), and
 * src/test/no-mock-results.test.tsx checks the source as well (no-mock-results REQ-NM-09).
 */
export const V7_EXAMPLE_DIFF = [
  { type: '-' as const, text: '<div class="pay-btn">Send Payment</div>' },
  { type: '+' as const, text: '<button type="submit" class="btn-primary">' },
  { type: '+' as const, text: '  Send Payment' },
  { type: '+' as const, text: '</button>' },
];

export const V7_EXAMPLE_HOOK_EVENTS = [
  'File saved: SendPayment.tsx',
  'Haunted Audit scan triggered',
  'Accessibility issue found: Missing accessible label',
];

export const V7_EXAMPLE_OUTCOMES = [
  'Customer can complete the payment',
  'A regression test prevents it from breaking again',
  'Accessibility built into the dev workflow with Kiro',
];
