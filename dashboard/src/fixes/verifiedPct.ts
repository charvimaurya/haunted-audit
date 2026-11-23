import type { Fix } from './fixContext';
/**
 * "Approved fixes verified" for this session's one fix: 100 when the checker said PASSED on the patched copy,
 * 0 when it said BLOCKED, and null (shown as --) until an approved fix has a finished Verifier run.
 */
export function verifiedPct(fix: Fix | null): number | null {
  if (!fix || fix.status !== 'approved' || !fix.verify || fix.verify.status !== 'complete' || !fix.verify.verdict) return null;
  return fix.verify.verdict === 'PASSED' ? 100 : 0;
}
