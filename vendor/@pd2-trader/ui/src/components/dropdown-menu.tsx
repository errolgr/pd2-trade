import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
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

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu"
    {...props} />;
}

function DropdownMenuPortal({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  const container = usePanelPortalContainer();
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal"
    container={container}
    {...props} />;
}

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(function DropdownMenuTrigger({ ...props }, ref) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger"
    ref={ref}
    {...props} />;
});

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 4, ...props }, ref) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(menuContentClass, floatingMotionClass, className)}
        ref={ref}
        {...props}
      />
    </DropdownMenuPortal>
  );
});

const DropdownMenuGroup = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>
>(function DropdownMenuGroup({ ...props }, ref) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group"
    ref={ref}
    {...props} />;
});

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
    variant?: 'default' | 'destructive';
  }
>(function DropdownMenuItem({ className, inset, variant = 'default', ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(menuItemClass, className)}
      ref={ref}
      {...props}
    />
  );
});

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className, children, checked, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(menuCheckableItemClass, className)}
      checked={checked}
      ref={ref}
      {...props}
    >
      <span className={menuIndicatorClass}>
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
});

const DropdownMenuRadioGroup = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioGroup>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioGroup>
>(function DropdownMenuRadioGroup({ ...props }, ref) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group"
    ref={ref}
    {...props} />;
});

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(function DropdownMenuRadioItem({ className, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(menuCheckableItemClass, className)}
      ref={ref}
      {...props}
    >
      <span className={menuIndicatorClass}>
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
});

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(function DropdownMenuLabel({ className, inset, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(menuLabelClass, className)}
      ref={ref}
      {...props}
    />
  );
});

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(menuSeparatorClass, className)}
      ref={ref}
      {...props}
    />
  );
});

const DropdownMenuShortcut = React.forwardRef<React.ElementRef<'span'>, React.ComponentPropsWithoutRef<'span'>>(
  function DropdownMenuShortcut({ className, ...props }, ref) {
    return (
      <span
        data-slot="dropdown-menu-shortcut"
        className={cn(menuShortcutClass, className)}
        ref={ref}
        {...props}
      />
    );
  },
);

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub"
    {...props} />;
}

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(function DropdownMenuSubTrigger({ className, inset, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(menuSubTriggerClass, className)}
      ref={ref}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
});

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(function DropdownMenuSubContent({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(menuContentClass, floatingMotionClass, className)}
      ref={ref}
      {...props}
    />
  );
});

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
