import { Page } from '../../components/Page';
import { UnavailablePanel } from '../../components/UnavailablePanel';

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="accessibility">
        <UnavailablePanel title="Statement not available yet">
          <p className="m-0">
            This site aims for WCAG 2.1 AA: one H1 per page, visible focus, 16px text, and calm
            mode for reduced motion. A full accessibility statement and contact path are not
            available yet.
          </p>
        </UnavailablePanel>
      </Page>
    </div>
  );
}
