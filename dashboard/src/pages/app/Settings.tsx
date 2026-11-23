import { Page } from '../../components/Page';
import { UnavailablePanel } from '../../components/UnavailablePanel';

export default function Settings() {
  return (
    <Page id="app-settings">
      <UnavailablePanel>
        <p className="m-0">
          Calm mode, high contrast and sound are in the top bar on every page and are saved on this
          device. A text-size setting is not built yet, so it is not shown here. Browser zoom works on
          every page.
        </p>
      </UnavailablePanel>
    </Page>
  );
}
