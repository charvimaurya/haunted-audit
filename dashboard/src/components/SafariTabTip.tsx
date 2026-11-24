/**
 * SafariTabTip: Safari only moves Tab between text fields by default. After the last field, Tab goes to
 * the address bar and opens Safari's Favourites. Buttons need Option+Tab, or the Safari setting
 * "Press Tab to highlight each item on a webpage". The page cannot change this, so it says so in plain words.
 * Shown only in Safari.
 */
import { Info } from 'lucide-react';

/** True for Safari on Mac, iPhone and iPad. False for Chrome, Edge, Firefox and Android browsers. */
export function isSafari(userAgent: string): boolean {
  return /safari/i.test(userAgent) && !/chrome|chromium|crios|fxios|edg|android|opr\//i.test(userAgent);
}

export function SafariTabTip() {
  if (typeof navigator === 'undefined' || !isSafari(navigator.userAgent)) return null;
  return (
    <p
      role="note"
      className="m-0 mt-3 flex items-start gap-2 rounded-lg border border-base-line bg-base-surface/60 px-4 py-3 text-base font-ui text-ink"
    >
      <Info size={16} className="mt-1 shrink-0 text-violet-neon" aria-hidden="true" />
      <span>
        Safari tip: by default Tab only visits text fields, so the next Tab jumps to the address bar and opens
        Favourites. To Tab to buttons, hold <strong>Option</strong> while you press Tab, or turn on
        Safari &gt; Settings &gt; Advanced &gt; "Press Tab to highlight each item on a webpage".
      </span>
    </p>
  );
}
