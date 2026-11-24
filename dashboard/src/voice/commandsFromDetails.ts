import type { TestDetails } from '../types';
/** Quote a typed value for the voice grammar: double quotes, or single quotes when the value has a double quote. */
function quoted(v: string): string {
  return v.includes('"') && !v.includes("'") ? `'${v}'` : `"${v}"`;
}
/**
 * The voice commands for the tester's own details (user-typed-test-details REQ-TD-03).
 * Only the values typed are used; an empty field gives no command.
 */
export function commandsFromDetails(d: TestDetails): string[] {
  const out: string[] = [];
  if (d.recipient.trim()) out.push(`type ${quoted(d.recipient.trim())} in Recipient`);
  if (d.amount.trim()) out.push(`type ${quoted(d.amount.trim())} in Amount`);
  if (d.reference.trim()) out.push(`type ${quoted(d.reference.trim())} in Reference`);
  if (out.length) out.push('click Send Payment');
  return out;
}
