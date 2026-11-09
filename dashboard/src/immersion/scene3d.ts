/**
 * The only door to decorative 3D.
 *
 * AmbientScene imports this module with a dynamic import, and only when
 * quality is "full". Mobile, low-power, Calm mode, and reduced motion never
 * reach this file. There is no WebGL library in the bundle: a future scene
 * has to be added here, behind the same import, so navigation still paints
 * before any 3D code arrives.
 */
export function mountDecorativeScene(host: HTMLElement | null): () => void {
  if (!host) return () => {};
  host.dataset.scene3d = 'mounted';
  return () => {
    delete host.dataset.scene3d;
  };
}
