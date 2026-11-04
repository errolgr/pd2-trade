import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { useUiLabels } from '../lib/labels';
import { cn } from '../lib/utils';
import { Label } from './label';
import { Separator } from './separator';

/** What a convenience `Field` (one with `label`/`hint`/`error`) hands to its control. */
interface FieldControlContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

const FieldControlContext = React.createContext<FieldControlContextValue | null>(null);

interface FieldControlProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: React.AriaAttributes['aria-invalid'];
}

/**
 * Wires a control to the enclosing convenience `Field`: its `id` (the label's `htmlFor`), the hint and error ids in
 * `aria-describedby`, and `aria-invalid` while there is an error. Explicit props win; outside such a Field the props
 * come back unchanged. Every DS form control calls it (Input, Textarea, SelectTrigger, NativeSelect, Checkbox,
 * Switch, and through Input: InputGroupInput, SearchInput, Combobox, NumberInput).
 */
function useFieldControl<P extends FieldControlProps>(props: P): P {
  const field = React.useContext(FieldControlContext);
  if (!field) return props;
  const describedBy = [props['aria-describedby'], field.describedBy].filter(Boolean).join(' ') || undefined;
  return {
    ...props,
    id: props.id ?? field.id,
    'aria-describedby': describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field.invalid || undefined),
  };
}

const fieldVariants = cva('group/field flex w-full min-w-0', {
  variants: {
    orientation: {
      vertical: 'flex-col gap-1.5',
      horizontal: [
        'flex-row items-center gap-3',
        '[&>[data-slot=field-label]]:flex-auto',
        'has-[>[data-slot=field-content]]:items-start',
        'has-[>[data-slot=field-content]]:[&>[role=checkbox]]:mt-px has-[>[data-slot=field-content]]:[&>[role=switch]]:mt-px',
      ],
    },
  },
  defaultVariants: { orientation: 'vertical' },
});

interface FieldProps extends React.ComponentPropsWithoutRef<'div'>, VariantProps<typeof fieldVariants> {
  /**
   * Convenience mode: renders `FieldLabel` + the single child control + hint + error and wires the control (id,
   * `aria-describedby`, `aria-invalid`). Without `label`/`hint`/`error` the Field is a plain layout row for the parts.
   */
  label?: React.ReactNode;
  /** Muted help line under the control (`FieldDescription`). */
  hint?: React.ReactNode;
  /** Error line under the control (`FieldError`, `role="alert"`); marks the field and control invalid. */
  error?: React.ReactNode;
  /** Adds a muted "optional" tag after the label. */
  optional?: boolean;
}

/**
 * One form field: label, control, description and error. Compose the parts yourself (`FieldLabel`,
 * `FieldDescription`, `FieldError`, `FieldContent`) or pass `label`/`hint`/`error` and a single control child.
 * `data-invalid` / `data-disabled` on the Field restyle the label and parts.
 */
const Field = React.forwardRef<HTMLDivElement, FieldProps>(function Field(
  { className, orientation, label, hint, error, optional, children, id: idProp, ...props },
  ref,
) {
  const labels = useUiLabels();
  const auto = React.useId();
  const convenience = label !== undefined || hint !== undefined || error !== undefined;
  const orient = orientation ?? 'vertical';
  const root = (content: React.ReactNode, invalid?: boolean) => (
    <div
      role="group"
      data-slot="field"
      data-orientation={orient}
      data-invalid={invalid || undefined}
      className={cn(fieldVariants({ orientation: orient }), className)}
      id={idProp}
      ref={ref}
      {...props}
    >
      {content}
    </div>
  );
  if (!convenience) return root(children);

  const child = React.isValidElement<{ id?: string }>(children) ? children : null;
  const controlId = child?.props.id ?? `${auto}-control`;
  const hasHint = hint !== undefined && hint !== null && hint !== false && hint !== '';
  const hasError = error !== undefined && error !== null && error !== false && error !== '';
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hasHint && hintId, hasError && errorId].filter(Boolean).join(' ') || undefined;
  const control = (
    <FieldControlContext.Provider value={{ id: controlId, describedBy, invalid: hasError }}>
      {children}
    </FieldControlContext.Provider>
  );
  const notes = (
    <>
      {hasHint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
      {hasError && <FieldError id={errorId}>{error}</FieldError>}
    </>
  );
  const labelNode = label !== undefined && (
    <FieldLabel htmlFor={controlId}
      className={cn(orient === 'horizontal' && 'min-w-27.5 shrink-0 flex-none!')}>
      {label}
      {optional && <span className="font-normal text-muted-foreground">{labels.optional}</span>}
    </FieldLabel>
  );
  return root(
    orient === 'horizontal' ? (
      <>
        {labelNode}
        <FieldContent>
          {control}
          {notes}
        </FieldContent>
      </>
    ) : (
      <>
        {labelNode}
        {control}
        {notes}
      </>
    ),
    hasError,
  );
});

/** A `<fieldset>` of related fields (a filter block, a choice list); title it with `FieldLegend`. */
const FieldSet = React.forwardRef<HTMLFieldSetElement, React.ComponentPropsWithoutRef<'fieldset'>>(function FieldSet(
  { className, ...props },
  ref,
) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        'flex min-w-0 flex-col gap-3 has-[>[data-slot=radio-group]]:gap-2 has-[>[data-slot=field-group]]:gap-3',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

/** `variant="legend"` titles a fieldset (text-sm semibold); `variant="label"` reads like a field label. */
const FieldLegend = React.forwardRef<
  HTMLLegendElement,
  React.ComponentPropsWithoutRef<'legend'> & { variant?: 'legend' | 'label' }
>(function FieldLegend({ className, variant = 'legend', ...props }, ref) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        'mb-1 text-sm data-[variant=label]:font-medium data-[variant=legend]:font-semibold data-[variant=legend]:tracking-tight',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

/** Stack of Fields (a form body or a fieldset's rows). Nested groups tighten. */
const FieldGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(function FieldGroup(
  { className, ...props },
  ref,
) {
  return (
    <div
      data-slot="field-group"
      className={cn('group/field-group flex w-full flex-col gap-4 *:data-[slot=field-group]:gap-3', className)}
      ref={ref}
      {...props}
    />
  );
});

/** Label + description column next to a control in a horizontal Field (checkbox and switch rows). */
const FieldContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(function FieldContent(
  { className, ...props },
  ref,
) {
  return (
    <div
      data-slot="field-content"
      className={cn('group/field-content flex min-w-0 flex-1 flex-col gap-1 leading-snug', className)}
      ref={ref}
      {...props}
    />
  );
});

/**
 * The field's label (`Label`). Inside a convenience Field it points at the control on its own. Wrapping a whole
 * horizontal `Field` turns it into a selectable choice card (checked control → glow border).
 */
const FieldLabel = React.forwardRef<React.ElementRef<typeof Label>, React.ComponentPropsWithoutRef<typeof Label>>(
  function FieldLabel({ className, htmlFor, ...props }, ref) {
    const field = React.useContext(FieldControlContext);
    return (
      <Label
        data-slot="field-label"
        htmlFor={htmlFor ?? field?.id}
        className={cn(
          'group/field-label peer/field-label w-fit leading-snug group-data-[disabled=true]/field:opacity-50 group-data-[invalid=true]/field:text-destructive',
          'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border has-[>[data-slot=field]]:border-border *:data-[slot=field]:p-3',
          'has-data-[state=checked]:border-glow/50 has-data-[state=checked]:bg-glow/5',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

/** A label-styled title that is not a `<label>` (inside a choice card, next to a control that has its own label). */
const FieldTitle = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(function FieldTitle(
  { className, ...props },
  ref,
) {
  return (
    <div
      data-slot="field-title"
      className={cn(
        'flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

/** Muted help text under a control or a legend. */
const FieldDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<'p'>>(
  function FieldDescription({ className, ...props }, ref) {
    return (
      <p
        data-slot="field-description"
        className={cn(
          'text-xs leading-snug font-normal text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-foreground',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

/** Hairline between field blocks, with optional centered text ("or"). */
const FieldSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(function FieldSeparator(
  { className, children, ...props },
  ref,
) {
  return (
    <div
      data-slot="field-separator"
      data-content={children ? true : undefined}
      className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}
      ref={ref}
      {...props}
    >
      <Separator className="flex-1" />
      {children && (
        <>
          <span data-slot="field-separator-content">{children}</span>
          <Separator className="flex-1" />
        </>
      )}
    </div>
  );
});

interface FieldErrorProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Validation errors (react-hook-form / zod shape); duplicates collapse, several render as a list. */
  errors?: ReadonlyArray<{ message?: string } | undefined>;
}

/** Error text (`role="alert"`); renders nothing without children or messages. */
const FieldError = React.forwardRef<HTMLDivElement, FieldErrorProps>(function FieldError(
  { className, children, errors, ...props },
  ref,
) {
  let content: React.ReactNode = children;
  if (!content && errors) {
    const messages = [...new Set(errors.map((e) => e?.message).filter((m): m is string => !!m))];
    content =
      messages.length > 1 ? (
        <ul className="ml-4 flex list-disc flex-col gap-0.5">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : (
        messages[0]
      );
  }
  if (!content) return null;
  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-xs leading-snug font-normal text-destructive', className)}
      ref={ref}
      {...props}
    >
      {content}
    </div>
  );
});

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
  useFieldControl,
};
export type { FieldProps, FieldErrorProps };
