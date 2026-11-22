import { Page } from '../components/Page';

export default function Scans() {
  return (
    <Page id="scans">
      <section aria-labelledby="scans-na" className="panel p-6">
        <h2 id="scans-na" className="m-0 text-xl font-bold font-ui text-ink">
          Not available yet
        </h2>
        <p className="mt-2 mb-0 max-w-2xl text-base font-ui text-ink-muted">
          Scans need an API route that does not exist yet (POST /scan). No scan results are
          shown here because none have been measured.
        </p>
      </section>
    </Page>
  );
}
