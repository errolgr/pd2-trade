/**
 * Test-only helpers for the settings forms: a reactive stand-in for `useOptions` and a native
 * `<select>` replacement for the Radix Select (its popper/pointer handling does not run in happy-dom).
 */
import React from 'react';
import { vi, type Mock } from 'vitest';
import type { ISettings } from '@/hooks/useOptions';

type OptionsState = { settings: ISettings; isLoading: boolean };

export interface OptionsStore {
  useOptions: () => OptionsState & {
    updateSettings: OptionsStore['updateSettings'];
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
  };
  updateSettings: Mock<(patch: Partial<ISettings>) => Promise<void>>;
  /** Simulates an external change (other window, file reload). */
  replace(next: Partial<ISettings>, loading?: boolean): void;
}

/** Settings store whose `updateSettings` merges the patch, like the real provider after a successful write. */
export function createOptionsStore(initial: Partial<ISettings>, isLoading = false): OptionsStore {
  let state: OptionsState = { settings: initial as ISettings, isLoading };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  const updateSettings = vi.fn(async (patch: Partial<ISettings>) => {
    state = { ...state, settings: { ...state.settings, ...patch } };
    notify();
  });

  const useOptions = () => {
    const s = React.useSyncExternalStore(subscribe, () => state);
    return { ...s, updateSettings, isOpen: false, setIsOpen: vi.fn() };
  };

  return {
    useOptions,
    updateSettings,
    replace(next, loading = false) {
      state = { settings: next as ISettings, isLoading: loading };
      notify();
    },
  };
}

type SelectCtx = {
  value?: string;
  onValueChange?: (v: string) => void;
  disabled?: boolean;
  items: React.ReactNode;
};
const SelectContext = React.createContext<SelectCtx>({ items: null });

function Select({
  value,
  defaultValue,
  onValueChange,
  disabled,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  let items: React.ReactNode = null;
  React.Children.forEach(children, (child) => {
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === SelectContent) {
      items = child.props.children;
    }
  });
  return (
    <SelectContext.Provider value={{ value: value ?? defaultValue, onValueChange, disabled, items }}>
      {children}
    </SelectContext.Provider>
  );
}

const SelectTrigger = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectTrigger({ children: _children, className: _className, ...props }, ref) {
    const ctx = React.useContext(SelectContext);
    return (
      <select
        {...props}
        ref={ref}
        disabled={ctx.disabled}
        value={ctx.value ?? ''}
        onChange={(e) => ctx.onValueChange?.(e.target.value)}
      >
        <option value=""
          disabled>
          -
        </option>
        {ctx.items}
      </select>
    );
  },
);

function SelectContent(_props: { children: React.ReactNode }) {
  return null;
}

function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}

function SelectValue() {
  return null;
}

/** Module shape for `vi.mock('@/components/ui/select', () => selectShim)`. */
export const selectShim = { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
