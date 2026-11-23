import { HeroSection } from '../components/HeroSection';
import { pageFor, to } from '../routes';

/**
 * Home: marketing hero only. Other product panels live on their own routes —
 * scrolling this page must not reveal Ghost Hunt, Pipeline, or Results.
 */
export default function Home() {
  const page = pageFor('/');
  return (
    <>
      <HeroSection to={to('try')} />
      {/* The page description is for screen readers; v7 shows no caption (docs/ui-fidelity.md D3). */}
      {page && <p className="sr-only">{page.shows}</p>}
    </>
  );
}
