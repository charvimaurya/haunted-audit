import { Page } from '../../components/Page';
import { UnavailablePanel } from '../../components/UnavailablePanel';

export default function Scans() {
  return (
    <Page id="app-scans">
      <UnavailablePanel>
        <p className="m-0">
          Scans need an API route that does not exist yet (POST /scan). No scan results are shown
          here because none have been measured.
        </p>
      </UnavailablePanel>
    </Page>
  );
}
