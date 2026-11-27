import { HeroSection } from '../components/hero/HeroSection';
import { pageFor, to } from '../routes';

/**
 * Home: marketing hero only. Other product panels live on their own routes —
 * scrolling this page must not reveal Ghost Hunt, Pipeline, or Results.
 */
export default function Home() {
  const page = pageFor('/');
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-1 min-h-0 flex-col px-3 py-3 sm:px-6 sm:py-4">
      <HeroSection to={to('possession')} />
      {/* The page description is for screen readers; v7 shows no caption (docs/ui-fidelity.md D3). */}
      {page && <p className="sr-only">{page.shows}</p>}
    </div>
  );
}
