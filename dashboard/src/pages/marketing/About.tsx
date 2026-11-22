import { Page } from '../../components/Page';
import { UnavailablePanel } from '../../components/UnavailablePanel';

export default function About() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="about">
        <UnavailablePanel>
          <p className="m-0">
            Haunted Audit is an accessibility guardrail for AI-built applications. A longer about
            page is not available yet.
          </p>
        </UnavailablePanel>
      </Page>
    </div>
  );
}
