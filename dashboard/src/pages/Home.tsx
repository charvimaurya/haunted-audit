import { HeroSection } from '../components/HeroSection';
import { to } from '../routes';
import { pageFor } from '../routes';

/**
 * Home: marketing hero only. Other product panels live on their own routes —
 * scrolling this page must not reveal Ghost Hunt, Pipeline, or Results.
 */
export default function Home() {
  const page = pageFor('/');
  return (
    <>
      <HeroSection to={to('try')} />
      {page && (
        <p className="mx-auto max-w-2xl px-4 pb-10 pt-2 text-center text-base font-ui text-ink-muted">
          {page.shows}
        </p>
      )}
    </>
  );
}
