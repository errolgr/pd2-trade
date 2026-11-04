import * as React from 'react';
import { Info } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FieldDescription, FieldLabel } from './field';
import { FormDescription, FormItem, FormLabel } from './form';
import { Skeleton } from './skeleton';
import { cn } from '../lib/utils';

/**
 * Building blocks shared by every settings section: a section header, grouped cards of rows
 * (label + description on the left, control on the right), inline hints and a loading skeleton.
 */

/**
 * The flash on the setting openPanel('settings', { field }) jumps to: the settings window finds the element by its
 * `data-setting-key` and sets `data-highlighted` on it for a moment. SettingsRow applies it for `settingKey`.
 */
export const SETTING_HIGHLIGHT =
  'data-[highlighted]:bg-primary/10 data-[highlighted]:ring-2 data-[highlighted]:ring-primary/60';

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
        <Heading className={cn('font-semibold tracking-tight text-foreground', as === 'h3' ? 'text-base' : 'text-sm')}>
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
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
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
  /**
   * Control rendered on the right (inline) or under the label (stacked). Inside a Form/FormField wrap the focusable
   * part in FormControl; standalone, give the control `id={controlId}`.
   */
  control?: React.ReactNode;
  /** Standalone rows (no react-hook-form): the control's id, so clicking the label focuses/toggles it. */
  controlId?: string;
  /** Extra content rendered full-width under the row (chips, previews...). */
  children?: React.ReactNode;
  /** `stacked` puts the control under the label at full width (text inputs). */
  layout?: 'inline' | 'stacked';
  disabled?: boolean;
  className?: string;
  /** Extra classes for the label (rarely needed). */
  labelClassName?: string;
  /** The ISettings key this row edits: openPanel('settings', { field }) scrolls to it and flashes it. */
  settingKey?: string;
}

/**
 * One setting. Inside a react-hook-form Form (in a FormField) it is a FormItem, so FormLabel/FormControl/FormDescription
 * keep their id + aria wiring. Outside a Form it renders plain Field parts: pass `controlId` (= the control's `id`)
 * so the label points at the control. Clicking the label focuses/toggles the control.
 */
export function SettingsRow({
  label,
  description,
  control,
  controlId,
  children,
  layout = 'inline',
  disabled,
  className,
  labelClassName,
  settingKey,
}: SettingsRowProps) {
  const inForm = useFormContext() != null;
  const stacked = layout === 'stacked';
  const labelClasses = cn(
    'text-sm font-medium leading-snug text-foreground group-data-[disabled]/row:text-muted-foreground',
    labelClassName,
  );
  const descriptionClasses = 'text-sm leading-relaxed text-muted-foreground';
  const descriptionId = controlId && description ? `${controlId}-description` : undefined;
  const labelNode = inForm ? (
    <FormLabel className={labelClasses}>{label}</FormLabel>
  ) : (
    <FieldLabel htmlFor={controlId}
      className={labelClasses}>
      {label}
    </FieldLabel>
  );
  const descriptionNode =
    description &&
    (inForm ? (
      <FormDescription className={descriptionClasses}>{description}</FormDescription>
    ) : (
      <FieldDescription id={descriptionId}
        className={descriptionClasses}>
        {description}
      </FieldDescription>
    ));
  const Root = inForm ? FormItem : 'div';
  return (
    <Root
      data-slot="settings-row"
      data-disabled={disabled || undefined}
      data-setting-key={settingKey}
      className={cn(
        'group/row flex flex-col gap-3 px-4 py-3.5 transition-[color,background-color,box-shadow] duration-(--dur-fast) ease-out hover:bg-accent/25',
        'data-[disabled]:hover:bg-transparent data-[highlighted]:ring-inset',
        SETTING_HIGHLIGHT,
        className,
      )}
    >
      {stacked ? (
        <div className="flex flex-col gap-2">
          {labelNode}
          {control && <div className="flex w-full items-center gap-2">{control}</div>}
          {descriptionNode}
        </div>
      ) : (
        <div className="flex flex-row items-center justify-between gap-x-6">
          <div className="min-w-0 flex-1 space-y-1">
            {labelNode}
            {descriptionNode}
          </div>
          {control && <div className="flex shrink-0 items-center gap-2">{control}</div>}
        </div>
      )}
      {children}
    </Root>
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
