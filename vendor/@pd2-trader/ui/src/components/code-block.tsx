import * as React from 'react';
import { Check, Copy } from 'lucide-react';

import { highlightCode } from '../lib/highlight';
import { useUiLabels } from '../lib/labels';
import { cn } from '../lib/utils';
import { Button } from './button';
import { toast } from './sonner';

type CodeBlockSize = '2xs' | 'xs' | 'sm';

const SIZE_CLASSES: Record<CodeBlockSize, string> = {
  '2xs': 'p-3 text-2xs',
  xs: 'p-3 text-xs',
  sm: 'px-4 py-3 text-sm',
};

interface CodeBlockProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'title' | 'onCopy'> {
  /** The source text (trailing newlines dropped), rendered verbatim and copied by the copy button. */
  code: string;
  /**
   * Header content on the left: a file name or caption ("list-button.tsx"), or a control such as a `TabsList`
   * for multi-language examples. Strings render monospace and truncate.
   */
  title?: React.ReactNode;
  /**
   * Language label on the right of the header. `json`, `bash`/`sh`/`shell`/`curl`, `js`/`ts`/`jsx`/`tsx` and
   * `python`/`py` are also syntax-tinted; anything else renders as plain text.
   */
  language?: string;
  /** `2xs` dense overlay panels, `xs` (default) docs and panels, `sm` website article pages. */
  size?: CodeBlockSize;
  /** Show the copy button. Default true. */
  copyable?: boolean;
  /**
   * Called after a copy attempt with whether it worked. Default: an error toast (UiLabels `copyFailed`) when it
   * fails; success is shown on the button.
   */
  onCopy?: (ok: boolean) => void;
  /** Accessible name of the scrollable code region ("profile.txt"). */
  label?: string;
  /** Classes for the scrolling `<pre>`: height cap (default `max-h-96`; `max-h-none` to grow), text tone. */
  viewportClassName?: string;
}

/** Clipboard API, falling back to a hidden textarea + `execCommand` where the API is missing or denied. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/**
 * Multi-line code or config (example sources, API responses, filter JSON): monospace `<pre>` that scrolls both ways,
 * an optional title / language header, light syntax tinting for common languages and a copy button. Inline
 * snippets use Code.
 */
const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  { code, title, language, size = 'xs', copyable = true, onCopy, label, viewportClassName, className, ...props },
  ref,
) {
  const labels = useUiLabels();
  const [copied, setCopied] = React.useState(false);
  const text = code.replace(/\n+$/, '');
  const tokens = React.useMemo(() => highlightCode(text, language), [text, language]);

  React.useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) setCopied(true);
    if (onCopy) onCopy(ok);
    else if (!ok) toast.error(labels.copyFailed);
  };

  const copyButton = copyable && (
    <Button
      variant="ghost"
      size="icon-xs"
      data-slot="code-block-copy"
      aria-label={copied ? labels.copied : labels.copy}
      title={copied ? labels.copied : labels.copy}
      className={copied ? 'text-success' : undefined}
      onClick={() => void copy()}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
  const hasHeader = title != null || language != null;

  return (
    <div
      data-slot="code-block"
      className={cn('relative overflow-hidden rounded-lg border border-border bg-muted/40', className)}
      ref={ref}
      {...props}
    >
      {hasHeader && (
        <div
          data-slot="code-block-header"
          className="flex min-h-8 items-center gap-2 border-b border-border pr-1 pl-3 text-2xs text-muted-foreground"
        >
          <span className={cn('min-w-0 flex-1', typeof title === 'string' && 'truncate font-mono')}>{title}</span>
          {language && <span className="shrink-0 uppercase tracking-caps text-3xs font-medium">{language}</span>}
          {copyButton}
        </div>
      )}
      {!hasHeader && copyButton && <div className="absolute top-1 right-1 bg-muted/80 rounded-md">{copyButton}</div>}
      <pre
        data-slot="code-block-pre"
        tabIndex={0}
        aria-label={label}
        className={cn(
          'm-0 max-h-96 overflow-auto font-mono leading-relaxed whitespace-pre text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          SIZE_CLASSES[size],
          !hasHeader && copyButton && 'pr-9',
          viewportClassName,
        )}
      >
        <code>{tokens}</code>
      </pre>
    </div>
  );
});

export { CodeBlock };
export type { CodeBlockProps, CodeBlockSize };
