import { Page } from '../../components/Page';
import { UnavailablePanel } from '../../components/UnavailablePanel';

export default function Settings() {
  return (
    <Page id="app-settings">
      <UnavailablePanel>
        <p className="m-0">
          Calm mode, high contrast, text size and sound are in the top bar on every page (in the menu on
          a phone) and are saved on this device. Browser zoom works on every page too.
        </p>
      </UnavailablePanel>
    </Page>
  );
}
