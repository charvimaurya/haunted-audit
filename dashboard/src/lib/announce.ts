/** Write a short message into the page's polite live region (#live-region). */
export function announce(message: string): void {
  const el = document.getElementById('live-region');
  if (!el) return;
  el.textContent = '';
  // Set on the next frame so the same message is announced again if repeated
  window.requestAnimationFrame(() => {
    el.textContent = message;
  });
}
