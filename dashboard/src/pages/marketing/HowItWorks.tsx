import { Page } from '../../components/Page';
import { UnavailablePanel } from '../../components/UnavailablePanel';

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="how-it-works">
        <UnavailablePanel>
          <p className="m-0">
            Detect barriers, propose a fix, verify with a real run, then prevent regressions. A
            fuller walkthrough is not available yet — nothing below is a fake demo.
          </p>
        </UnavailablePanel>
      </Page>
    </div>
  );
}
