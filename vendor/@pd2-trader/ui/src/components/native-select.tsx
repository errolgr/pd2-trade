import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { cn } from '../lib/utils';
import { useFieldControl } from './field';

interface NativeSelectProps extends Omit<React.ComponentPropsWithoutRef<'select'>, 'size'> {
  /** `default` = h-9, `sm` = h-8. */
  size?: 'sm' | 'default';
}

/**
 * A styled native `<select>` with a chevron: the platform picker (wheel/sheet on phones, OS list on desktop). Use it
 * in website forms where a native picker is better; use `Select` for custom rows (icons, descriptions) and in the
 * overlay. `className` goes on the wrapper (width, layout); `ref` and every other prop on the `<select>`.
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(function NativeSelect(
  { className, size = 'default', ...rest },
  ref,
) {
  const props = useFieldControl(rest);
  return (
    <div data-slot="native-select-wrapper"
      className={cn('group/native-select relative w-fit has-[select:disabled]:opacity-50', className)}>
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          'h-9 w-full min-w-0 cursor-pointer appearance-none rounded-md border border-input bg-transparent py-1.5 pr-8 pl-3 text-sm shadow-xs transition-[color,background-color,border-color,box-shadow] duration-(--dur-fast) ease-out outline-none hover:border-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1 dark:bg-input/30',
          'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
          // The OS list paints options with the select's colors: give them the popover's so dark themes stay legible.
          '[&_option]:bg-popover [&_option]:text-popover-foreground [&_optgroup]:bg-popover [&_optgroup]:text-muted-foreground',
        )}
        ref={ref}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden
        data-slot="native-select-icon"
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground opacity-50 select-none"
      />
    </div>
  );
});

/** One `<option>`. */
const NativeSelectOption = React.forwardRef<HTMLOptionElement, React.ComponentPropsWithoutRef<'option'>>(
  function NativeSelectOption(props, ref) {
    return <option data-slot="native-select-option"
      ref={ref}
      {...props} />;
  },
);

/** An `<optgroup>` (`label` is its heading). */
const NativeSelectOptGroup = React.forwardRef<HTMLOptGroupElement, React.ComponentPropsWithoutRef<'optgroup'>>(
  function NativeSelectOptGroup(props, ref) {
    return <optgroup data-slot="native-select-optgroup"
      ref={ref}
      {...props} />;
  },
);

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
export type { NativeSelectProps };
