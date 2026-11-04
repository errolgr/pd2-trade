import { KbdCombo } from '@pd2-trader/ui';

export const meta = {
  title: 'Combo from a string',
  description: '`KbdCombo` renders a stored hotkey string (`Ctrl+Shift+D`) or a key array with `+` separators. Keys are shown as written.',
  order: 1,
};

export default function KbdComboExample() {
  return (
    <div className="flex w-fit flex-col gap-3 rounded-lg border bg-surface p-4 text-xs text-surface-foreground">
      <p className="flex items-center gap-2">
        Price check <KbdCombo keys="Ctrl+D" />
      </p>
      <p className="flex items-center gap-2">
        Toggle overlay <KbdCombo keys="Ctrl+Shift+D" />
      </p>
      <p className="flex items-center gap-2">
        Zoom in <KbdCombo keys={['Ctrl', '+']} />
      </p>
    </div>
  );
}
