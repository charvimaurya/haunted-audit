import { Link } from 'react-router-dom';
import { Page } from '../../components/Page';
import { APP_NAV, to } from '../../routes';

export default function AppHome() {
  const tools = APP_NAV.filter((item) => item.to !== to('app-home'));
  return (
    <Page id="app-home">
      <section aria-labelledby="app-tools-heading" className="panel p-6">
        <h2 id="app-tools-heading" className="m-0 text-xl font-bold font-ui text-ink">
          Tools
        </h2>
        <p className="mt-2 mb-4 text-base font-ui text-ink-muted">
          Open one tool at a time. Metrics stay -- until a real run measures them.
        </p>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {tools.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex min-h-11 items-center rounded-lg border border-base-line px-4 text-base font-ui text-ink
                           hover:border-violet-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
