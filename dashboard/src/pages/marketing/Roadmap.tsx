import { Page } from '../../components/Page';
import { UnavailablePanel } from '../../components/UnavailablePanel';

export default function Roadmap() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="roadmap">
        <UnavailablePanel>
          <p className="m-0">
            Planned work will be listed here when it is ready. No dates or fake milestones are
            shown.
          </p>
        </UnavailablePanel>
      </Page>
    </div>
  );
}
