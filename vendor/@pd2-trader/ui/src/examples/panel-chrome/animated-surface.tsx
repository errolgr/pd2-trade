import { PanelChrome, PanelSurface } from '@pd2-trader/ui';

const Body = () => (
  <div className="flex flex-col gap-2 p-3 text-xs">
    <p className="text-muted-foreground">Rune exchange rates, last 24h</p>
    <div className="flex justify-between">
      <span className="text-q-rune">Ber</span>
      <span className="tabular-nums">1.00 HR</span>
    </div>
    <div className="flex justify-between">
      <span className="text-q-rune">Jah</span>
      <span className="tabular-nums">0.95 HR</span>
    </div>
    <div className="flex justify-between">
      <span className="text-q-rune">Lo</span>
      <span className="tabular-nums">0.42 HR</span>
    </div>
  </div>
);

export const meta = {
  title: 'Animated surface',
  description:
    '`animate` scales the surface in on mount (skipped with reduced motion); use it for panels that open on a hotkey.',
  order: 2,
};

export default function AnimatedSurfaceExample() {
  return (
    <PanelSurface className="w-sidebar"
      animate>
      <PanelChrome title="Animated in"
        onClose={() => undefined} />
      <Body />
    </PanelSurface>
  );
}
