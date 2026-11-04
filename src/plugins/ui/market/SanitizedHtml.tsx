import React from 'react';
import { cn } from '@pd2-trader/ui';
import { openUrl } from '@/lib/browser-opener';

/**
 * Typography for server-rendered markdown (listing description, changelogs) on the DS type scale.
 * DS candidate: prose container.
 */
const PROSE = cn(
  'text-xs leading-relaxed text-foreground break-words',
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
  '[&_p]:my-1.5',
  '[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold',
  '[&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold',
  '[&_h4]:mt-2 [&_h4]:mb-0.5 [&_h4]:text-2xs [&_h4]:font-semibold [&_h4]:uppercase [&_h4]:tracking-caps [&_h4]:text-muted-foreground',
  '[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5',
  '[&_strong]:font-semibold [&_em]:italic [&_s]:text-muted-foreground',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
  '[&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-2xs',
  '[&_pre]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_blockquote]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-2.5 [&_blockquote]:text-muted-foreground',
  '[&_hr]:my-3 [&_hr]:border-border',
  '[&_table]:my-1.5 [&_table]:w-full [&_table]:text-2xs [&_th]:border-b [&_th]:border-border [&_th]:px-1.5 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold [&_td]:border-b [&_td]:border-border/60 [&_td]:px-1.5 [&_td]:py-1',
);

/**
 * Renders `html` that the marketplace server already sanitized (`descriptionHtml`, `changelogHtml`). Only pass
 * those API fields: nothing else is HTML. Links open in the system browser instead of the overlay window.
 */
export function SanitizedHtml({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(PROSE, className)}
      data-keep-keyboard
      onClick={(e) => {
        const link = e.target instanceof Element ? e.target.closest('a') : null;
        if (!link?.href) return;
        e.preventDefault();
        if (link.protocol === 'https:') void openUrl(link.href);
      }}
      // Server-sanitized allowlist HTML (contract: descriptionHtml / changelogHtml).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
