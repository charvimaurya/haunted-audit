import { HeroSection } from '../components/hero/HeroSection';
import { pageFor, to } from '../routes';

export default function Home() {
  const page = pageFor('/');
  return (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-start lg:justify-center px-1 sm:px-2 py-1 sm:py-2">
      <HeroSection to={to('possession')} />
      {page && <p className="sr-only">{page.shows}</p>}
    </div>
  );
}
