import * as React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';

import { cn } from '../lib/utils';
import { usePanelPortalContainer } from '../lib/portal';
import {
  floatingMotionClass,
  menuCheckableItemClass,
  menuContentClass,
  menuIndicatorClass,
  menuItemClass,
  menuLabelClass,
  menuSeparatorClass,
  menuShortcutClass,
  menuSubTriggerClass,
} from './menu-styles';

/** Right-click (long-press on touch) menu on an area. Same parts and look as `DropdownMenu`. */
function ContextMenu({ ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu"
    {...props} />;
}

function ContextMenuPortal({ ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  const container = usePanelPortalContainer();
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal"
    container={container}
    {...props} />;
}

const ContextMenuTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>
>(function ContextMenuTrigger({ ...props }, ref) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger"
    ref={ref}
    {...props} />;
});

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(function ContextMenuContent({ className, ...props }, ref) {
  return (
    <ContextMenuPortal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(menuContentClass, floatingMotionClass, className)}
        ref={ref}
        {...props}
      />
    </ContextMenuPortal>
  );
});

const ContextMenuGroup = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Group>
>(function ContextMenuGroup({ ...props }, ref) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group"
    ref={ref}
    {...props} />;
});

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
    variant?: 'default' | 'destructive';
  }
>(function ContextMenuItem({ className, inset, variant = 'default', ...props }, ref) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(menuItemClass, className)}
      ref={ref}
      {...props}
    />
  );
});

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(function ContextMenuCheckboxItem({ className, children, checked, ...props }, ref) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(menuCheckableItemClass, className)}
      checked={checked}
      ref={ref}
      {...props}
    >
      <span className={menuIndicatorClass}>
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
});

const ContextMenuRadioGroup = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioGroup>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioGroup>
>(function ContextMenuRadioGroup({ ...props }, ref) {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group"
    ref={ref}
    {...props} />;
});

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(function ContextMenuRadioItem({ className, children, ...props }, ref) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(menuCheckableItemClass, className)}
      ref={ref}
      {...props}
    >
      <span className={menuIndicatorClass}>
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
});

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(function ContextMenuLabel({ className, inset, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(menuLabelClass, className)}
      ref={ref}
      {...props}
    />
  );
});

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(function ContextMenuSeparator({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn(menuSeparatorClass, className)}
      ref={ref}
      {...props}
    />
  );
});

const ContextMenuShortcut = React.forwardRef<React.ElementRef<'span'>, React.ComponentPropsWithoutRef<'span'>>(
  function ContextMenuShortcut({ className, ...props }, ref) {
    return (
      <span
        data-slot="context-menu-shortcut"
        className={cn(menuShortcutClass, className)}
        ref={ref}
        {...props}
      />
    );
  },
);

function ContextMenuSub({ ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub"
    {...props} />;
}

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(function ContextMenuSubTrigger({ className, inset, children, ...props }, ref) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(menuSubTriggerClass, className)}
      ref={ref}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </ContextMenuPrimitive.SubTrigger>
  );
});

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(function ContextMenuSubContent({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      className={cn(menuContentClass, floatingMotionClass, className)}
      ref={ref}
      {...props}
    />
  );
});

export {
  ContextMenu,
  ContextMenuPortal,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
};
