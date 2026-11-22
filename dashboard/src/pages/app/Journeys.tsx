import { Link } from 'react-router-dom';
import { Page } from '../../components/Page';
import { to } from '../../routes';

/** Journeys: the user journeys that can be run. Today there is one, Send Payment. */
export default function Journeys() {
  return (
    <Page id="app-journeys">
      <section aria-labelledby="journey-send-payment" className="panel p-6">
        <h2 id="journey-send-payment" className="m-0 text-xl font-bold font-ui text-ink">
          Send Payment
        </h2>
        <p className="mt-2 mb-4 max-w-2xl text-base font-ui text-ink-muted">
          Send EUR 50 on the Haunted Bank test site using only the keyboard.
        </p>
        <Link
          to={to('possession')}
          className="inline-flex min-h-11 items-center rounded-lg border border-base-line px-4 text-base font-ui text-ink
                     hover:border-violet-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
        >
          Open Possession Mode
        </Link>
      </section>
    </Page>
  );
}
