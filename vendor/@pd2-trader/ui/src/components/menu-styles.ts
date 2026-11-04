/*
 * Shared class strings of the floating surfaces, so DropdownMenu and ContextMenu (and Popover and HoverCard)
 * cannot drift apart. Internal: not exported from the package barrel.
 */

/** Enter/exit motion of every Radix popper surface (menus, popovers, hover cards). */
export const floatingMotionClass =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2';

/** Popover-like card surface (Popover, HoverCard). */
export const popoverSurfaceClass =
  'z-floating rounded-lg border border-border bg-popover text-popover-foreground shadow-panel outline-none duration-(--dur-med) ease-out';

/** Menu surface: `*MenuContent` and `*MenuSubContent`. */
export const menuContentClass =
  'z-floating min-w-32 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-panel duration-(--dur-fast) ease-out';

const menuRowClass =
  "relative flex cursor-default items-center gap-2 rounded-md py-1.5 text-sm outline-hidden transition-colors duration-(--dur-fast) select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

/** `*MenuItem` (`data-variant="destructive"`, `data-inset`). */
export const menuItemClass = `${menuRowClass} px-2 data-[inset]:pl-8 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive`;

/** `*MenuCheckboxItem` / `*MenuRadioItem`: room on the left for the indicator. */
export const menuCheckableItemClass = `${menuRowClass} pr-2 pl-8`;

/** Wrapper of the check / dot indicator of a checkable item. */
export const menuIndicatorClass = 'pointer-events-none absolute left-2 flex size-3.5 items-center justify-center';

/** `*MenuSubTrigger` (open state stays highlighted while the submenu is open). */
export const menuSubTriggerClass = `${menuRowClass} px-2 data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground`;

/** `*MenuLabel` (`data-inset`). */
export const menuLabelClass = 'px-2 py-1.5 text-sm font-semibold data-[inset]:pl-8';

export const menuSeparatorClass = '-mx-1 my-1 h-px bg-border';

export const menuShortcutClass = 'ml-auto text-xs tracking-widest text-muted-foreground';
