import { Page } from '../../components/Page';
import { UnavailablePanel } from '../../components/UnavailablePanel';

export default function Trust() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="trust">
        <UnavailablePanel>
          <p className="m-0">
            Unmeasured values show as --. We do not invent pass rates or scores. A longer trust
            page is not available yet.
          </p>
        </UnavailablePanel>
      </Page>
    </div>
  );
}
