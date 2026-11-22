import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <header className="pt-10">
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
      <p className="mt-4 flex flex-wrap gap-3">
        {[
          { to: '/', label: 'Home' },
          { to: '/journeys/send-payment/possession', label: 'Possession Mode' },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="inline-flex min-h-11 items-center rounded-lg border border-base-line px-4 text-base font-ui text-ink hover:border-violet-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            {l.label}
          </Link>
        ))}
      </p>
    </header>
  );
}
