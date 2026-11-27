/**
 * CodeBlock
 *
 * Monospace code display with optional diff highlighting.
 * Used in the Fix panel to show the before/after HTML patch.
 */

interface CodeLine {
  text: string;
  /** '+' = added (green), '-' = removed (red), ' ' = neutral */
  type?: '+' | '-' | ' ';
}

interface CodeBlockProps {
  lines: CodeLine[];
  language?: string;
  /** Optional label for screen readers */
  ariaLabel?: string;
}

const LINE_STYLE: Record<string, string> = {
  '+': 'bg-ghost-verified/10 text-ghost-verified',
  '-': 'bg-ghost-blocked/10 text-ghost-blocked',
  ' ': 'text-ink-muted',
};

export function CodeBlock({ lines, language = 'html', ariaLabel }: CodeBlockProps) {
  return (
    <figure
      className="code-block my-0"
      aria-label={ariaLabel ?? `${language} code block`}
      role="figure"
    >
      {language && (
        <figcaption className="sr-only">{language} code snippet</figcaption>
      )}
      <pre className="m-0 whitespace-pre-wrap break-words">
        <code>
          {lines.map((line, i) => (
            <span
              key={i}
              className={`block px-1 rounded-sm leading-relaxed whitespace-pre-wrap break-all font-mono text-base ${
                LINE_STYLE[line.type ?? ' '] ?? LINE_STYLE[' ']
              }`}
            >
              {/* Marker in text, so a change is not shown by colour alone */}
              {line.type === '+' && <><span aria-hidden="true">+ </span><span className="sr-only">Added: </span></>}
              {line.type === '-' && <><span aria-hidden="true">- </span><span className="sr-only">Removed: </span></>}
              {line.type === ' ' && <span aria-hidden="true">  </span>}
              {line.text}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
