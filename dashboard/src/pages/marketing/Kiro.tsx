import { KiroIntegrationSection } from '../../components/hero/KiroIntegrationSection';
import { Page } from '../../components/layout/Page';

export default function Kiro() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="kiro">
        <KiroIntegrationSection />
      </Page>
    </div>
  );
}
