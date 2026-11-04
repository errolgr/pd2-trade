import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { PanelLeftIcon } from 'lucide-react';

import { useUiLabels } from '../lib/labels';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Separator } from './separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './sheet';
import { Skeleton } from './skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

/** Below this viewport width (px) the sidebar renders inside a Sheet (shadcn's `md` breakpoint). */
const SIDEBAR_MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${SIDEBAR_MOBILE_BREAKPOINT - 1}px)`;

function subscribeMobile(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getMobileSnapshot() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;
}

type SidebarContextValue = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean | ((open: boolean) => boolean)) => void;
  isMobile: boolean;
  /** Collapses/expands the sidebar (opens/closes the sheet on narrow viewports). Wire host hotkeys here. */
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

/** Sidebar state from the enclosing `SidebarProvider`. */
function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider.');
  return context;
}

type SidebarProviderProps = React.ComponentPropsWithoutRef<'div'> & {
  /** Uncontrolled initial state. */
  defaultOpen?: boolean;
  /** Controlled expanded state (desktop). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Force the sheet layout (true) or the in-flow layout (false); default follows the viewport width. */
  isMobile?: boolean;
};

/**
 * Holds the sidebar state and lays the sidebar and its `SidebarInset` out in a row. No keyboard shortcut and no
 * persistence: the host owns hotkeys (call `toggleSidebar` from `useSidebar`) and stores `open` if it wants to.
 */
const SidebarProvider = React.forwardRef<React.ElementRef<'div'>, SidebarProviderProps>(function SidebarProvider(
  { defaultOpen = true, open: openProp, onOpenChange, isMobile: isMobileProp, className, children, ...props },
  ref,
) {
  /** Viewport below the sidebar breakpoint (SSR snapshot: false). */
  const viewportMobile = React.useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
  const isMobile = isMobileProp ?? viewportMobile;
  const [openMobile, setOpenMobile] = React.useState(false);
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;

  const setOpen = React.useCallback(
    (value: boolean | ((open: boolean) => boolean)) => {
      const next = typeof value === 'function' ? value(open) : value;
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [open, openProp, onOpenChange],
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((o) => !o);
    else setOpen((o) => !o);
  }, [isMobile, setOpen]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state: open ? 'expanded' : 'collapsed',
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [open, setOpen, openMobile, isMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        className={cn('group/sidebar-wrapper relative flex w-full', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
});

type SidebarProps = React.ComponentPropsWithoutRef<'div'> & {
  side?: 'left' | 'right';
  /** `offcanvas` slides fully away, `icon` keeps an icon rail, `none` is always expanded. */
  collapsible?: 'offcanvas' | 'icon' | 'none';
};

/**
 * The side column. In-flow (it takes space in the provider's row and animates its width), so it works inside an
 * overlay panel as well as on a page. Put it after `SidebarInset` for `side="right"`.
 */
const Sidebar = React.forwardRef<React.ElementRef<'div'>, SidebarProps>(function Sidebar(
  { side = 'left', collapsible = 'offcanvas', className, children, ...props },
  ref,
) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  const labels = useUiLabels();

  if (collapsible === 'none') {
    return (
      <div
        data-slot="sidebar"
        className={cn('flex h-full w-sidebar shrink-0 flex-col bg-sidebar text-sidebar-foreground', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile}
        onOpenChange={setOpenMobile}>
        <SheetContent
          data-slot="sidebar"
          data-mobile="true"
          side={side}
          className="w-sidebar max-w-viewport gap-0 bg-sidebar p-0 text-sidebar-foreground sm:max-w-sidebar [&>button]:hidden"
          ref={ref}
          {...props}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{labels.sidebar}</SheetTitle>
            <SheetDescription>{labels.sidebar}</SheetDescription>
          </SheetHeader>
          <div className={cn('flex h-full w-full flex-col', className)}>{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-side={side}
      className="group/sidebar peer relative w-sidebar shrink-0 text-sidebar-foreground transition-[width] duration-(--dur-med) ease-out data-[collapsible=icon]:w-12 data-[collapsible=offcanvas]:w-0"
      ref={ref}
      {...props}
    >
      <div
        className={cn('absolute inset-0 flex overflow-hidden', side === 'right' && 'justify-end')}
      >
        <div
          data-slot="sidebar-inner"
          className={cn(
            'flex h-full w-sidebar shrink-0 flex-col border-sidebar-border bg-sidebar transition-[width] duration-(--dur-med) ease-out group-data-[collapsible=icon]/sidebar:w-12',
            side === 'left' ? 'border-r' : 'border-l',
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

/** Icon button that collapses/expands the sidebar (`useSidebar().toggleSidebar`). */
const SidebarTrigger = React.forwardRef<React.ElementRef<typeof Button>, React.ComponentPropsWithoutRef<typeof Button>>(
  function SidebarTrigger({ className, onClick, ...props }, ref) {
    const { toggleSidebar } = useSidebar();
    const labels = useUiLabels();
    return (
      <Button
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon-sm"
        aria-label={labels.toggleSidebar}
        className={className}
        onClick={(event) => {
          onClick?.(event);
          toggleSidebar();
        }}
        ref={ref}
        {...props}
      >
        <PanelLeftIcon />
      </Button>
    );
  },
);

/** Thin hit strip on the sidebar's inner edge: click to collapse/expand (pointer only, skipped by Tab). */
const SidebarRail = React.forwardRef<React.ElementRef<'button'>, React.ComponentPropsWithoutRef<'button'>>(
  function SidebarRail({ className, ...props }, ref) {
    const { toggleSidebar } = useSidebar();
    const labels = useUiLabels();
    return (
      <button
        type="button"
        data-slot="sidebar-rail"
        aria-label={labels.toggleSidebar}
        tabIndex={-1}
        onClick={toggleSidebar}
        title={labels.toggleSidebar}
        className={cn(
          'absolute inset-y-0 z-raised hidden w-2 outline-none after:absolute after:inset-y-0 after:w-0.5 after:transition-colors after:duration-(--dur-fast) hover:after:bg-sidebar-ring/60 group-data-[side]/sidebar:flex',
          'group-data-[side=left]/sidebar:right-0 group-data-[side=left]/sidebar:after:right-0 group-data-[side=right]/sidebar:left-0 group-data-[side=right]/sidebar:after:left-0',
          'group-data-[side=left]/sidebar:cursor-w-resize group-data-[side=right]/sidebar:cursor-e-resize',
          'group-data-[side=left]/sidebar:group-data-[state=collapsed]/sidebar:cursor-e-resize group-data-[side=right]/sidebar:group-data-[state=collapsed]/sidebar:cursor-w-resize',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

/** The content next to the sidebar (fills the rest of the row). */
const SidebarInset = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function SidebarInset({ className, ...props }, ref) {
    return (
      <div
        data-slot="sidebar-inset"
        className={cn('relative flex min-w-0 flex-1 flex-col', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

const SidebarHeader = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function SidebarHeader({ className, ...props }, ref) {
    return <div data-slot="sidebar-header"
      className={cn('flex flex-col gap-2 p-2', className)}
      ref={ref}
      {...props} />;
  },
);

const SidebarFooter = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function SidebarFooter({ className, ...props }, ref) {
    return <div data-slot="sidebar-footer"
      className={cn('flex flex-col gap-2 p-2', className)}
      ref={ref}
      {...props} />;
  },
);

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentPropsWithoutRef<typeof Separator>
>(function SidebarSeparator({ className, ...props }, ref) {
  return (
    <Separator
      data-slot="sidebar-separator"
      className={cn('mx-2 w-auto bg-sidebar-border data-[orientation=horizontal]:w-auto', className)}
      ref={ref}
      {...props}
    />
  );
});

/** Scrolling middle section between header and footer. */
const SidebarContent = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function SidebarContent({ className, ...props }, ref) {
    return (
      <div
        data-slot="sidebar-content"
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-1 overflow-auto group-data-[collapsible=icon]/sidebar:overflow-hidden',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

const SidebarGroup = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function SidebarGroup({ className, ...props }, ref) {
    return (
      <div
        data-slot="sidebar-group"
        className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

const SidebarGroupLabel = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & { asChild?: boolean }
>(function SidebarGroupLabel({ className, asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      data-slot="sidebar-group-label"
      className={cn(
        'flex h-7 shrink-0 items-center rounded-md px-2 text-2xs font-medium tracking-caps text-sidebar-foreground/70 uppercase outline-none transition-[margin,opacity] duration-(--dur-med) ease-out focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 group-data-[collapsible=icon]/sidebar:-mt-7 group-data-[collapsible=icon]/sidebar:opacity-0 [&>svg]:size-3.5 [&>svg]:shrink-0',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

/** Icon button in the group's top-right corner ("Add", "Refresh"); give it an `aria-label`. */
const SidebarGroupAction = React.forwardRef<
  React.ElementRef<'button'>,
  React.ComponentPropsWithoutRef<'button'> & { asChild?: boolean }
>(function SidebarGroupAction({ className, asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="sidebar-group-action"
      className={cn(
        'absolute top-3 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none transition-colors duration-(--dur-fast) hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 group-data-[collapsible=icon]/sidebar:hidden [&>svg]:size-3.5 [&>svg]:shrink-0',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

const SidebarGroupContent = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function SidebarGroupContent({ className, ...props }, ref) {
    return <div data-slot="sidebar-group-content"
      className={cn('w-full text-xs', className)}
      ref={ref}
      {...props} />;
  },
);

const SidebarMenu = React.forwardRef<React.ElementRef<'ul'>, React.ComponentPropsWithoutRef<'ul'>>(
  function SidebarMenu({ className, ...props }, ref) {
    return <ul data-slot="sidebar-menu"
      className={cn('flex w-full min-w-0 flex-col gap-0.5', className)}
      ref={ref}
      {...props} />;
  },
);

const SidebarMenuItem = React.forwardRef<React.ElementRef<'li'>, React.ComponentPropsWithoutRef<'li'>>(
  function SidebarMenuItem({ className, ...props }, ref) {
    return <li data-slot="sidebar-menu-item"
      className={cn('group/menu-item relative', className)}
      ref={ref}
      {...props} />;
  },
);

const sidebarMenuButtonVariants = cva(
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none transition-[width,height,padding,background-color,color] duration-(--dur-fast) hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]/sidebar:size-8! group-data-[collapsible=icon]/sidebar:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

type SidebarMenuButtonProps = React.ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    asChild?: boolean;
    /** Current page/section. */
    isActive?: boolean;
    /** Shown to the right while the sidebar is collapsed to icons (a string or TooltipContent props). */
    tooltip?: string | React.ComponentPropsWithoutRef<typeof TooltipContent>;
  };

/** A row in the menu: icon + label (+ `SidebarMenuAction` / `SidebarMenuBadge`). `asChild` for router links. */
const SidebarMenuButton = React.forwardRef<React.ElementRef<'button'>, SidebarMenuButtonProps>(
  function SidebarMenuButton({ asChild = false, isActive = false, size = 'default', tooltip, className, ...props }, ref) {
    const Comp = asChild ? Slot : 'button';
    const { isMobile, state } = useSidebar();

    const button = (
      <Comp
        data-slot="sidebar-menu-button"
        data-size={size}
        data-active={isActive}
        aria-current={isActive && asChild ? 'page' : undefined}
        className={cn(sidebarMenuButtonVariants({ size }), className)}
        ref={ref}
        {...props}
      />
    );

    if (!tooltip) return button;
    const content = typeof tooltip === 'string' ? { children: tooltip } : tooltip;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right"
          align="center"
          hidden={state !== 'collapsed' || isMobile}
          {...content} />
      </Tooltip>
    );
  },
);

/** Icon button at the row's right edge (row "…" menu); `showOnHover` hides it until the row is hovered/focused. */
const SidebarMenuAction = React.forwardRef<
  React.ElementRef<'button'>,
  React.ComponentPropsWithoutRef<'button'> & { asChild?: boolean; showOnHover?: boolean }
>(function SidebarMenuAction({ className, asChild = false, showOnHover = false, ...props }, ref) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        'absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none transition-colors duration-(--dur-fast) hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-3.5 group-data-[collapsible=icon]/sidebar:hidden [&>svg]:size-3.5 [&>svg]:shrink-0',
        showOnHover &&
          'opacity-0 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground data-[state=open]:opacity-100',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

/** Count at the row's right edge (unread trades, listings). */
const SidebarMenuBadge = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function SidebarMenuBadge({ className, ...props }, ref) {
    return (
      <div
        data-slot="sidebar-menu-badge"
        className={cn(
          'pointer-events-none absolute top-1.5 right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-2xs font-medium text-sidebar-foreground tabular-nums select-none peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-3.5 group-data-[collapsible=icon]/sidebar:hidden',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

/** Loading placeholder shaped like a menu row. */
const SidebarMenuSkeleton = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & { showIcon?: boolean }
>(function SidebarMenuSkeleton({ className, showIcon = false, ...props }, ref) {
  return (
    <div
      data-slot="sidebar-menu-skeleton"
      className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
      ref={ref}
      {...props}
    >
      {showIcon && <Skeleton className="size-4 rounded-sm" />}
      <Skeleton className="h-3.5 max-w-3/4 flex-1" />
    </div>
  );
});

const SidebarMenuSub = React.forwardRef<React.ElementRef<'ul'>, React.ComponentPropsWithoutRef<'ul'>>(
  function SidebarMenuSub({ className, ...props }, ref) {
    return (
      <ul
        data-slot="sidebar-menu-sub"
        className={cn(
          'mx-3.5 flex min-w-0 translate-x-px flex-col gap-0.5 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]/sidebar:hidden',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

const SidebarMenuSubItem = React.forwardRef<React.ElementRef<'li'>, React.ComponentPropsWithoutRef<'li'>>(
  function SidebarMenuSubItem({ className, ...props }, ref) {
    return <li data-slot="sidebar-menu-sub-item"
      className={cn('group/menu-sub-item relative', className)}
      ref={ref}
      {...props} />;
  },
);

/** A nested link row (anchor by default; `asChild` for router links). */
const SidebarMenuSubButton = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'> & { asChild?: boolean; size?: 'sm' | 'md'; isActive?: boolean }
>(function SidebarMenuSubButton({ asChild = false, size = 'md', isActive = false, className, ...props }, ref) {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-size={size}
      data-active={isActive}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none transition-colors duration-(--dur-fast) hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:bg-sidebar-accent active:text-sidebar-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[size=md]:text-xs data-[size=sm]:text-2xs group-data-[collapsible=icon]/sidebar:hidden [&>span:last-child]:truncate [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
