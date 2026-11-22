import { Page } from '../../components/Page';
import { UnavailablePanel } from '../../components/UnavailablePanel';

export default function Settings() {
  return (
    <Page id="app-settings">
      <UnavailablePanel>
        <p className="m-0">
          Calm mode and sound are in the top bar on every page. High contrast and text size are not
          built yet, so they are not shown here.
        </p>
      </UnavailablePanel>
    </Page>
  );
}
