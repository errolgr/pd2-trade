/**
 * @pd2-trader/ui: the PD2 Trader design system. Every overlay surface, plugin panel and plugin slot composes from
 * these exports only (DESIGN_RULES.md, "Consistency rule"). Tokens live at `@pd2-trader/ui/tokens`, the generated
 * Tailwind theme at `@pd2-trader/ui/tailwind.css`. The package has no side effects, so unused components are
 * tree-shaken from app and plugin bundles.
 */

// Utilities and providers
export * from './lib/utils';
export * from './lib/portal';
export * from './lib/labels';
export * from './lib/motion';

// Primitives (shadcn/Radix, owned)
export * from './components/alert';
export * from './components/alert-dialog';
export * from './components/badge';
export * from './components/breadcrumb';
export * from './components/button';
export * from './components/button-group';
export * from './components/card';
export * from './components/chart';
export * from './components/checkbox';
export * from './components/command';
export * from './components/dialog';
export * from './components/dropdown-menu';
export * from './components/form';
export * from './components/input';
export * from './components/label';
export * from './components/popover';
export * from './components/progress';
export * from './components/scroll-area';
export * from './components/select';
export * from './components/separator';
export * from './components/sheet';
export * from './components/skeleton';
export * from './components/slider';
export * from './components/sonner';
export * from './components/switch';
export * from './components/table';
export * from './components/tabs';
export * from './components/textarea';
export * from './components/toggle';
export * from './components/toggle-group';
export * from './components/tooltip';

// Overlay patterns
export * from './components/panel-chrome';
export * from './components/hover-popover';
export * from './components/popover-parts';
export * from './components/settings';
export * from './components/state';

// Domain components
export * from './components/feedback';
export * from './components/item-name';
export * from './components/rune-icon';
export * from './components/price';
export * from './components/rows';
export * from './components/spark-chart';

// Plugin slot components
export * from './components/slots';
