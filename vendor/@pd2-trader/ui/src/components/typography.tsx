import * as React from 'react';

import { cn } from '../lib/utils';

type HeadingLevel = 1 | 2 | 3 | 4;

/** Type-scale step per level: 1 = page title, 2 = section, 3 = subsection / panel title, 4 = group label. */
const HEADING_CLASSES: Record<HeadingLevel, string> = {
  1: 'text-2xl font-semibold tracking-tight',
  2: 'text-base font-semibold tracking-tight',
  3: 'text-sm font-semibold tracking-tight',
  4: 'text-xs font-semibold',
};

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Visual size and, unless `as` is set, the element (`h1`–`h4`). */
  level?: HeadingLevel;
  /** Override the element when the document outline differs from the visual size (`level={3} as="h2"`). */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div';
}

/** Page, section and subsection titles bound to the type scale. */
const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { className, level = 2, as, ...props },
  ref,
) {
  const Comp = as ?? (`h${level}` as const);
  return (
    <Comp data-slot="heading"
      data-level={level}
      className={cn('text-foreground', HEADING_CLASSES[level], className)}
      ref={ref}
      {...props} />
  );
});

type TextSize = 'xs' | 'sm' | 'base';
type TextTone = 'default' | 'muted';

const TEXT_SIZE: Record<TextSize, string> = { xs: 'text-xs', sm: 'text-sm', base: 'text-base' };
const TEXT_TONE: Record<TextTone, string> = { default: 'text-foreground', muted: 'text-muted-foreground' };

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** `xs` = panel body (default), `sm` = primary values / website body, `base` = lead paragraphs. */
  size?: TextSize;
  tone?: TextTone;
}

/** A paragraph of body copy. */
const Text = React.forwardRef<HTMLParagraphElement, TextProps>(function Text(
  { className, size = 'xs', tone = 'default', ...props },
  ref,
) {
  return <p data-slot="text"
    className={cn(TEXT_SIZE[size], TEXT_TONE[tone], className)}
    ref={ref}
    {...props} />;
});

/** Secondary caption or meta line (`text-2xs` muted): "Updated 3 min ago". */
const Muted = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(function Muted(
  { className, ...props },
  ref,
) {
  return <p data-slot="muted"
    className={cn('text-2xs text-muted-foreground', className)}
    ref={ref}
    {...props} />;
});

/** Inline code in running text (`/trade`, a config key); inherits the surrounding size. For blocks use CodeBlock. */
const Code = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(function Code(
  { className, ...props },
  ref,
) {
  return (
    <code
      data-slot="code"
      className={cn('rounded-sm bg-muted px-1 py-0.5 font-mono text-foreground', className)}
      ref={ref}
      {...props}
    />
  );
});

type ProseElement = 'div' | 'article' | 'section' | 'main';

interface ProseProps extends React.HTMLAttributes<HTMLElement> {
  /** Wrapper element. Default `div`; `article` for a standalone page body. */
  as?: ProseElement;
}

/**
 * Long-form article typography for website pages, docs and guides (privacy policy, methodology): styles the plain
 * `section`, `h2`, `h3`, `p`, `ul`/`ol`, `strong`, inline `code` and `a` inside at the `text-base` prose size, so
 * hand-written articles need no per-element classes. Width comes from the page container.
 */
const Prose = React.forwardRef<HTMLElement, ProseProps>(function Prose({ className, as: Comp = 'div', ...props }, ref) {
  return (
    <Comp
      data-slot="prose"
      className={cn(
        'text-base leading-relaxed text-foreground/85',
        '[&_section]:mt-8 [&_section:first-child]:mt-0',
        '[&_h2]:mb-3 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground max-sm:[&_h2]:text-base',
        '[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground',
        '[&_p]:mb-3',
        '[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1.5 [&_li]:marker:text-muted-foreground',
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        '[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.25 [&_:not(pre)>code]:py-px [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-sm [&_:not(pre)>code]:wrap-anywhere',
        '[&_a]:text-glow [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-foreground',
        className,
      )}
      ref={ref as React.Ref<HTMLDivElement>}
      {...props}
    />
  );
});

export { Heading, Text, Muted, Code, Prose };
export type { HeadingProps, HeadingLevel, TextProps, TextSize, TextTone, ProseProps };
