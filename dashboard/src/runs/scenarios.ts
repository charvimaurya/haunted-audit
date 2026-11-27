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
  accentHex: string;
  navItems: [string, string, string, string];
  recipientLabel: string;
  amountLabel: string;
  referenceLabel: string;
}

export const SCENARIOS: readonly ScenarioDef[] = [
  {
    id: 'haunted-bank',
    name: 'Haunted Bank',
    category: 'Banking',
    submitLabel: 'Send Payment',
    summary: 'Money transfer checkout where the Send Payment control is trapped in a clickable div.',
    accentHex: '#a855f7',
    navItems: ['Dashboard', 'Send Payment', 'Accounts', 'Transactions'],
    recipientLabel: 'Recipient',
    amountLabel: 'Amount (EUR)',
    referenceLabel: 'Reference',
  },
  {
    id: 'phantom-checkout',
    name: 'Phantom Checkout',
    category: 'E-Commerce',
    submitLabel: 'Complete Order',
    summary: 'Retail cart confirmation where keyboard Tab skips past the Complete Order div.',
    accentHex: '#38bdf8',
    navItems: ['Storefront', 'Complete Order', 'Shipping', 'Promo Codes'],
    recipientLabel: 'Recipient / Buyer',
    amountLabel: 'Amount (EUR)',
    referenceLabel: 'Gift Note / Order Ref',
  },
  {
    id: 'cursed-clinic',
    name: 'Cursed Clinic',
    category: 'Healthcare',
    submitLabel: 'Confirm Visit',
    summary: 'Patient visit booking and co-pay portal blocked on a mouse-only confirm action.',
    accentHex: '#2dd4bf',
    navItems: ['Patient Portal', 'Confirm Visit', 'Doctors', 'Insurance'],
    recipientLabel: 'Patient Name',
    amountLabel: 'Amount (EUR)',
    referenceLabel: 'Visit Reason',
  },
  {
    id: 'ghost-hr',
    name: 'GhostHR Portal',
    category: 'Enterprise HR',
    submitLabel: 'Submit Request',
    summary: 'Employee expense & stipend claim form where Submit Request omits keyboard focus.',
    accentHex: '#f472b6',
    navItems: ['HR Home', 'Submit Request', 'Time Off', 'Policies'],
    recipientLabel: 'Employee Name',
    amountLabel: 'Amount (EUR)',
    referenceLabel: 'Cost Center / Note',
  },
  {
    id: 'crypt-cloud',
    name: 'CryptCloud Console',
    category: 'Developer SaaS',
    submitLabel: 'Invite Member',
    summary: 'Team workspace seat & budget allocation form unreachable without a mouse.',
    accentHex: '#818cf8',
    navItems: ['Clusters', 'Invite Member', 'API Keys', 'Usage Quota'],
    recipientLabel: 'Teammate Name',
    amountLabel: 'Amount (EUR)',
    referenceLabel: 'Role / Project Scope',
  },
  {
    id: 'specter-gov',
    name: 'SpecterGov Portal',
    category: 'Public Sector',
    submitLabel: 'Submit Renewal',
    summary: 'Municipal permit renewal fee portal failing WCAG 2.1.1 keyboard accessibility.',
    accentHex: '#fbbf24',
    navItems: ['Citizen Desk', 'Submit Renewal', 'Receipts', 'Notices'],
    recipientLabel: 'Applicant Name',
    amountLabel: 'Amount (EUR)',
    referenceLabel: 'Permit Number',
  },
  {
    id: 'haunted-uni',
    name: 'HauntedUni Registration',
    category: 'Education',
    submitLabel: 'Confirm Enrollment',
    summary: 'Student semester enrollment & lab fee confirmation trapped in a div control.',
    accentHex: '#fb923c',
    navItems: ['Campus', 'Confirm Enrollment', 'Lab Fees', 'Aid'],
    recipientLabel: 'Student Name',
    amountLabel: 'Amount (EUR)',
    referenceLabel: 'Course Code',
  },
  {
    id: 'hex-pay',
    name: 'HexPay Disputes',
    category: 'FinTech',
    submitLabel: 'Submit Dispute',
    summary: 'Card chargeback dispute form where Submit Dispute cannot be activated via Enter.',
    accentHex: '#c084fc',
    navItems: ['Disputes', 'Submit Dispute', 'Cards', 'Chargebacks'],
    recipientLabel: 'Merchant Name',
    amountLabel: 'Amount (EUR)',
    referenceLabel: 'Dispute Reason',
  },
  {
    id: 'necro-stream',
    name: 'NecroStream Billing',
    category: 'Subscriptions',
    submitLabel: 'Confirm Cancellation',
    summary: 'Subscription cancellation refund flow blocking keyboard-only users with a div button.',
    accentHex: '#f87171',
    navItems: ['Watchlist', 'Confirm Cancellation', 'Billing', 'Devices'],
    recipientLabel: 'Account Holder',
    amountLabel: 'Amount (EUR)',
    referenceLabel: 'Cancellation Reason',
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
