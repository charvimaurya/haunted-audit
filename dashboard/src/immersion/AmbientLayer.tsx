/**
 * Page-level decoration. It sits under the navigation and the main content,
 * cannot be focused, and ignores the pointer. The semantic ghost is not here.
 */

import { lazy, Suspense } from 'react';
import { useImmersion } from './ImmersionContext';

const AmbientScene = lazy(() => import('./AmbientScene'));

export function AmbientLayer() {
  const { motionAllowed, quality } = useImmersion();
  const showScene = motionAllowed && quality !== 'static';

  return (
    <div
      className="ambient-layer"
      aria-hidden="true"
      data-testid="ambient-layer"
      data-ambient={showScene ? 'on' : 'off'}
      data-quality={quality}
    >
      {showScene && (
        <Suspense fallback={null}>
          <AmbientScene quality={quality} />
        </Suspense>
      )}
    </div>
  );
}
