import { PossessionJourney } from '../../components/PossessionJourney';

/** Try: the same Keyboard / Voice journey as Possession Mode, on a public page. */
export default function Try() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PossessionJourney pageId="try" />
    </div>
  );
}
