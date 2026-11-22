/**
 * Honest empty state when a page or API is not ready. Never invents metrics.
 */
interface UnavailablePanelProps {
  title?: string;
  children: React.ReactNode;
}

export function UnavailablePanel({ title = 'Not available yet', children }: UnavailablePanelProps) {
  return (
    <section aria-labelledby="unavailable-heading" className="panel p-6">
      <h2 id="unavailable-heading" className="m-0 text-xl font-bold font-ui text-ink">
        {title}
      </h2>
      <div className="mt-2 max-w-2xl text-base font-ui text-ink-muted">{children}</div>
    </section>
  );
}
