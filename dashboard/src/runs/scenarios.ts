export type ScenarioId =
  | 'haunted-bank'
  | 'phantom-checkout'
  | 'cursed-clinic'
  | 'ghost-hr'
  | 'crypt-cloud'
  | 'specter-gov'
  | 'haunted-uni'
  | 'hex-pay'
  | 'necro-stream';

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  category: string;
  submitLabel: string;
  summary: string;
}

export const SCENARIOS: readonly ScenarioDef[] = [
  {
    id: 'haunted-bank',
    name: 'Haunted Bank',
    category: 'Banking',
    submitLabel: 'Send Payment',
    summary: 'Money transfer checkout where the Send Payment control is trapped in a clickable div.',
  },
  {
    id: 'phantom-checkout',
    name: 'Phantom Checkout',
    category: 'E-Commerce',
    submitLabel: 'Complete Order',
    summary: 'Retail cart confirmation where keyboard Tab skips past the Complete Order div.',
  },
  {
    id: 'cursed-clinic',
    name: 'Cursed Clinic',
    category: 'Healthcare',
    submitLabel: 'Confirm Visit',
    summary: 'Patient visit booking and co-pay portal blocked on a mouse-only confirm action.',
  },
  {
    id: 'ghost-hr',
    name: 'GhostHR Portal',
    category: 'Enterprise HR',
    submitLabel: 'Submit Request',
    summary: 'Employee expense & stipend claim form where Submit Request omits keyboard focus.',
  },
  {
    id: 'crypt-cloud',
    name: 'CryptCloud Console',
    category: 'Developer SaaS',
    submitLabel: 'Invite Member',
    summary: 'Team workspace seat & budget allocation form unreachable without a mouse.',
  },
  {
    id: 'specter-gov',
    name: 'SpecterGov Portal',
    category: 'Public Sector',
    submitLabel: 'Submit Renewal',
    summary: 'Municipal permit renewal fee portal failing WCAG 2.1.1 keyboard accessibility.',
  },
  {
    id: 'haunted-uni',
    name: 'HauntedUni Registration',
    category: 'Education',
    submitLabel: 'Confirm Enrollment',
    summary: 'Student semester enrollment & lab fee confirmation trapped in a div control.',
  },
  {
    id: 'hex-pay',
    name: 'HexPay Disputes',
    category: 'FinTech',
    submitLabel: 'Submit Dispute',
    summary: 'Card chargeback dispute form where Submit Dispute cannot be activated via Enter.',
  },
  {
    id: 'necro-stream',
    name: 'NecroStream Billing',
    category: 'Subscriptions',
    submitLabel: 'Confirm Cancellation',
    summary: 'Subscription cancellation refund flow blocking keyboard-only users with a div button.',
  },
] as const;

export const SCENARIO_BY_ID: Record<ScenarioId, ScenarioDef> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s]),
) as Record<ScenarioId, ScenarioDef>;

export function isScenarioId(value: string | null | undefined): value is ScenarioId {
  return Boolean(value && value in SCENARIO_BY_ID);
}

export function normalizeScenarioId(value: string | null | undefined): ScenarioId {
  const clean = value?.trim().toLowerCase();
  return isScenarioId(clean) ? clean : 'haunted-bank';
}

export function getScenarioDef(value: string | null | undefined): ScenarioDef {
  return SCENARIO_BY_ID[normalizeScenarioId(value)];
}
