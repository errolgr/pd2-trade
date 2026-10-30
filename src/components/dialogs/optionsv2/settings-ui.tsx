import * as React from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { FormDescription, FormItem, FormLabel } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Building blocks shared by every settings section: a section header, grouped cards of rows
 * (label + description on the left, control on the right), inline hints and a loading skeleton.
 */

export type SettingsSectionId =
  | 'General'
  | 'Account'
  | 'Chat'
  | 'Interface'
  | 'Price Check'
  | 'Market'
  | 'Net Worth'
  | 'Hotkeys'
  | 'About';

/** Lets a form jump to another settings section (e.g. "configured under Hotkeys"). */
export const SettingsNavContext = React.createContext<((section: SettingsSectionId) => void) | null>(null);

interface SettingsSectionProps {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  /** Heading level; sub-sections inside a page use h4. */
  as?: 'h3' | 'h4';
  className?: string;
}

/** Page header (title + description) followed by the section content. */
export function SettingsSection({ title, description, children, as = 'h3', className }: SettingsSectionProps) {
  const Heading = as;
  return (
    <section className={cn('flex flex-col gap-y-4', className)}>
      <header className="space-y-1">
        <Heading className={cn('font-semibold tracking-tight text-foreground', as === 'h3' ? 'text-xl' : 'text-base')}>
          {title}
        </Heading>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

interface SettingsGroupProps {
  title?: string;
  /** Right side of the group heading (e.g. a status or a link). */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Dims the whole card (controls keep their own disabled state). */
  dimmed?: boolean;
}

/** Card that stacks setting rows with hairline dividers. */
export function SettingsGroup({ title, aside, children, className, dimmed }: SettingsGroupProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(title || aside) && (
        <div className="flex items-center justify-between gap-3 px-1">
          {title && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
          )}
          {aside}
        </div>
      )}
      <div
        className={cn(
          'divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-card/50 shadow-xs',
          'transition-opacity duration-(--dur-med) ease-out',
          dimmed && 'opacity-70',
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface SettingsRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Control rendered on the right (inline) or under the label (stacked). Wrap the focusable part in FormControl. */
  control?: React.ReactNode;
  /** Extra content rendered full-width under the row (chips, previews...). */
  children?: React.ReactNode;
  /** `stacked` puts the control under the label at full width (text inputs). */
  layout?: 'inline' | 'stacked';
  disabled?: boolean;
  className?: string;
  /** Extra classes for the label (rarely needed). */
  labelClassName?: string;
}

/**
 * One setting: FormItem so FormLabel/FormControl/FormDescription keep their id + aria wiring.
 * Clicking the label focuses/toggles the control.
 */
export function SettingsRow({
  label,
  description,
  control,
  children,
  layout = 'inline',
  disabled,
  className,
  labelClassName,
}: SettingsRowProps) {
  const stacked = layout === 'stacked';
  const labelBase = 'text-sm font-medium leading-snug text-foreground group-data-[disabled]/row:text-muted-foreground';
  const descriptionBase = 'text-[13px] leading-relaxed';
  return (
    <FormItem
      data-disabled={disabled || undefined}
      className={cn(
        'group/row flex flex-col gap-3 px-4 py-3.5 transition-colors duration-(--dur-fast) ease-out hover:bg-accent/25',
        'data-[disabled]:hover:bg-transparent',
        className,
      )}
    >
      {stacked ? (
        <div className="flex flex-col gap-2">
          <FormLabel className={cn(labelBase, labelClassName)}>{label}</FormLabel>
          {control && <div className="flex w-full items-center gap-2">{control}</div>}
          {description && <FormDescription className={descriptionBase}>{description}</FormDescription>}
        </div>
      ) : (
        <div className="flex flex-row items-center justify-between gap-x-6">
          <div className="min-w-0 flex-1 space-y-1">
            <FormLabel className={cn(labelBase, labelClassName)}>{label}</FormLabel>
            {description && <FormDescription className={descriptionBase}>{description}</FormDescription>}
          </div>
          {control && <div className="flex shrink-0 items-center gap-2">{control}</div>}
        </div>
      )}
      {children}
    </FormItem>
  );
}

/** Muted inline note with an info icon. */
export function SettingsHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground', className)}>
      <Info className="mt-px size-3.5 shrink-0 opacity-80" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Link-styled button that switches to another settings section; plain text outside the settings window.
 * `children` is optional for use as a <Trans> component, which supplies the translated link text.
 */
export function SettingsLink({ to, children }: { to: SettingsSectionId; children?: React.ReactNode }) {
  const go = React.useContext(SettingsNavContext);
  if (!go) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => go(to)}
      className="group/link inline-flex items-center gap-0.5 rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      {children}
      <ArrowRight className="size-3 transition-transform duration-(--dur-fast) ease-out group-hover/link:translate-x-0.5" />
    </button>
  );
}

/** Placeholder shown while settings load (forms used to render nothing). */
export function SettingsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden
      className="divide-y divide-border/60 rounded-lg border border-border/70 bg-card/50">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}
          className="flex items-center justify-between gap-6 px-4 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  );
}
