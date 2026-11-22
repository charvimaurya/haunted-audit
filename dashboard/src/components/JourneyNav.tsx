import { Link, useLocation } from 'react-router-dom';
import { FIX_STEPS, FIX_STEP_LABEL, JOURNEY } from '../routes';

const ITEMS = [
  { label: 'Possession Mode', to: `${JOURNEY}/possession` },
  { label: 'Agents', to: `${JOURNEY}/agents` },
  ...FIX_STEPS.map((s) => ({ label: FIX_STEP_LABEL[s], to: `${JOURNEY}/fixes/${s}` })),
];

/** Links between the pages of this journey. The current page is marked, not only coloured. */
export function JourneyNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Journey: Send Payment" className="mb-4">
      <p className="m-0 mb-1 text-base font-ui text-ink-muted">Journey: Send Payment</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {ITEMS.map((item) => {
          const current = pathname === item.to;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={current ? 'page' : undefined}
                className={[
                  'inline-flex min-h-11 items-center rounded-lg border px-3 text-base font-ui',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
                  current
                    ? 'border-violet-neon bg-violet-600/25 font-bold text-ink underline underline-offset-4'
                    : 'border-base-line text-ink-muted hover:text-ink',
                ].join(' ')}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

