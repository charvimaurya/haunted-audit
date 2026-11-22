import { Link } from 'react-router-dom';
import { to, type PageId } from '../routes';

const WAYS_BACK: { page: PageId; label: string }[] = [
  { page: 'home', label: 'Home' },
  { page: 'possession', label: 'Possession Mode' },
  { page: 'app-home', label: 'App dashboard' },
];

/** Catch-all for any unknown path, in either shell. Offers a way back. */
export default function NotFound() {
  return (
    <header className="pt-10 px-4 sm:px-6">
      <h1
        data-page-title
        tabIndex={-1}
        className="text-2xl font-bold font-ui text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded"
      >
        Page not found
      </h1>
      <p className="mt-2 max-w-2xl text-base font-ui text-ink-muted">
        This page does not exist. The ghost took it. Go back to the start or open the keyboard demo.
      </p>
      <nav aria-label="Ways back" className="mt-4">
        <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
          {WAYS_BACK.map((l) => (
            <li key={l.page}>
              <Link
                to={to(l.page)}
                className="inline-flex min-h-11 items-center rounded-lg border border-base-line px-4 text-base font-ui text-ink hover:border-violet-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
