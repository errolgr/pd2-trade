import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { SearchIcon, XIcon } from 'lucide-react';

import { useUiLabels } from '../lib/labels';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';

/**
 * An input or textarea with addons (icons, text, buttons, kbd) inside one bordered box. The focus ring and the
 * invalid border belong to the group.
 */
const InputGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(function InputGroup(
  { className, ...props },
  ref,
) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        'group/input-group relative flex h-9 w-full min-w-0 items-center rounded-md border border-input shadow-xs transition-[color,background-color,border-color,box-shadow] duration-(--dur-fast) ease-out outline-none hover:border-ring/40 dark:bg-input/30',
        'has-[>textarea]:h-auto',
        'has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2',
        'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-2.5',
        'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-2.5',
        'has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/40',
        'has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
        // Dimmed once as a whole (the control itself does not dim again).
        'data-[disabled=true]:opacity-50 has-[[data-slot=input-group-control]:disabled]:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none [&>svg:not([class*='size-'])]:size-4 [&>kbd]:rounded-sm",
  {
    variants: {
      align: {
        'inline-start': 'order-first pl-3 has-[>button]:-ml-1.5 has-[>kbd]:-ml-1',
        'inline-end': 'order-last pr-3 has-[>button]:-mr-1.5 has-[>kbd]:-mr-1',
        'block-start': 'order-first w-full justify-start px-3 pt-2.5 [.border-b]:pb-2.5',
        'block-end': 'order-last w-full justify-start px-3 pb-2.5 [.border-t]:pt-2.5',
      },
    },
    defaultVariants: { align: 'inline-start' },
  },
);

/** Icon, text, kbd or buttons beside the control; a click on its empty area focuses the control. */
const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof inputGroupAddonVariants>
>(function InputGroupAddon({ className, align = 'inline-start', onClick, ...props }, ref) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        onClick?.(e);
        if ((e.target as HTMLElement).closest('button')) return;
        e.currentTarget.parentElement?.querySelector<HTMLElement>('[data-slot=input-group-control]')?.focus();
      }}
      ref={ref}
      {...props}
    />
  );
});

const inputGroupButtonVariants = cva('flex items-center gap-2 shadow-none', {
  variants: {
    size: {
      xs: 'h-6 gap-1 rounded-sm px-2 has-[>svg]:px-2',
      sm: 'h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5',
      'icon-xs': 'size-6 rounded-sm p-0 has-[>svg]:p-0',
      'icon-sm': 'size-7 p-0 has-[>svg]:p-0',
    },
  },
  defaultVariants: { size: 'xs' },
});

type InputGroupButtonProps = Omit<React.ComponentPropsWithoutRef<typeof Button>, 'size'> &
  VariantProps<typeof inputGroupButtonVariants>;

/** A `Button` sized for an addon (`ghost` by default; icon-only ones need an `aria-label`). */
const InputGroupButton = React.forwardRef<HTMLButtonElement, InputGroupButtonProps>(function InputGroupButton(
  { className, type = 'button', variant = 'ghost', size = 'xs', ...props },
  ref,
) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      size={size}
      className={cn(inputGroupButtonVariants({ size }), className)}
      ref={ref}
      {...props}
    />
  );
});

/** Plain addon text (a unit, a prefix such as "https://"). */
const InputGroupText = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(
  function InputGroupText({ className, ...props }, ref) {
    return (
      <span
        data-slot="input-group-text"
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

/** The group's `Input` (borderless; the group draws the box and the focus ring). */
const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<typeof Input>>(
  function InputGroupInput({ className, ...props }, ref) {
    return (
      <Input
        data-slot="input-group-control"
        className={cn(
          'h-full flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 disabled:opacity-100 dark:bg-transparent',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

/** The group's `Textarea` (borderless, no resize handle). */
const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentPropsWithoutRef<typeof Textarea>>(
  function InputGroupTextarea({ className, ...props }, ref) {
    return (
      <Textarea
        data-slot="input-group-control"
        className={cn(
          'flex-1 resize-none rounded-none border-0 bg-transparent py-2.5 shadow-none focus-visible:ring-0 disabled:opacity-100 dark:bg-transparent',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

interface SearchInputProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'size'> {
  /** `sm` = h-8 (toolbars, dense panels), `md` = h-9, `lg` = h-11 with 16px text (a landing page's main search). */
  size?: 'sm' | 'md' | 'lg';
  /** Shows a clear (×) button while the field has text; called when it is pressed (reset your `value`). */
  onClear?: () => void;
}

/**
 * Search box: leading search icon, `type="search"` (native cancel glyph hidden) and, with `onClear`, a clear button
 * while it has text. `className` goes on the group; `ref` and every other prop on the input.
 */
const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { size = 'md', onClear, className, type = 'search', value, defaultValue, onChange, disabled, ...props },
  ref,
) {
  const labels = useUiLabels();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uncontrolledText, setUncontrolledText] = React.useState(String(defaultValue ?? ''));
  const text = value === undefined ? uncontrolledText : String(value ?? '');
  const setRefs = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };
  return (
    <InputGroup data-slot="search-input"
      data-disabled={disabled || undefined}
      className={cn(size === 'sm' && 'h-8', size === 'lg' && 'h-11', className)}>
      <InputGroupAddon>
        <SearchIcon aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        ref={setRefs}
        type={type}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        className={cn(
          '[&::-webkit-search-cancel-button]:appearance-none',
          size === 'sm' && 'md:text-xs',
          size === 'lg' && 'md:text-base',
        )}
        onChange={(e) => {
          if (value === undefined) setUncontrolledText(e.target.value);
          onChange?.(e);
        }}
        {...props}
      />
      {onClear && text !== '' && !disabled && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={labels.clear}
            onClick={() => {
              if (value === undefined && inputRef.current) {
                inputRef.current.value = '';
                setUncontrolledText('');
              }
              onClear();
              inputRef.current?.focus();
            }}
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
});

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  SearchInput,
};
export type { InputGroupButtonProps, SearchInputProps };
