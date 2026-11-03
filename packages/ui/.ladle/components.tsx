import { useEffect, useState, type ReactNode } from 'react';
import type { GlobalProvider } from '@ladle/react';
import { DEFAULT_THEME_ID, getTheme, THEME_TOKENS, THEMES, type Theme } from '@pd2-trader/ui/tokens';
import {
  Badge,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Slider,
  Toaster,
  TooltipProvider,
  UiLabelsProvider,
} from '@pd2-trader/ui';
import './catalog.css';

/**
 * Catalog toolbar state. Mirrors the overlay runtime (src/lib/themes.ts `applyTheme` / `applyWindowTransparency`):
 * theme vars inline on <html>, `data-theme`, `dark`/`light` class, `color-scheme`, and the two window-opacity vars.
 * Deep links for screenshots: `?pd2theme=<id>&pd2transparency=<0-90>` (stored, so they survive story navigation).
 */
const THEME_KEY = 'pd2-catalog-theme';
const TRANSPARENCY_KEY = 'pd2-catalog-transparency';
const TRANSPARENCY_MAX = 90;

function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  for (const token of THEME_TOKENS) root.style.setProperty(`--${token}`, theme.vars[token]);
  root.dataset.theme = theme.id;
  root.classList.toggle('dark', theme.mode === 'dark');
  root.classList.toggle('light', theme.mode === 'light');
  root.style.colorScheme = theme.mode;
}

const clampTransparency = (value: number) =>
  Number.isFinite(value) ? Math.min(TRANSPARENCY_MAX, Math.max(0, Math.round(value))) : 0;

function applyWindowTransparency(percent: number, root: HTMLElement = document.documentElement) {
  const transparency = clampTransparency(percent);
  root.style.setProperty('--window-opacity', `${100 - transparency}%`);
  root.style.setProperty('--window-opacity-elevated', `${Math.round(100 - transparency / 3)}%`);
}

function initial(param: string, key: string): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get(param);
  if (fromUrl !== null) {
    localStorage.setItem(key, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(key);
}

const DARK = THEMES.filter((t) => t.mode === 'dark');
const LIGHT = THEMES.filter((t) => t.mode === 'light');

function CatalogToolbar({
  themeId,
  onTheme,
  transparency,
  onTransparency,
}: {
  themeId: string;
  onTheme: (id: string) => void;
  transparency: number;
  onTransparency: (value: number) => void;
}) {
  const theme = getTheme(themeId);
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center gap-4 border-b bg-surface px-4 py-2 text-xs backdrop-blur-sm">
      <span className="text-3xs font-semibold uppercase tracking-caps text-muted-foreground">PD2 Trader UI</span>
      <div className="flex items-center gap-2">
        <Label htmlFor="catalog-theme">Theme</Label>
        <Select value={theme.id}
          onValueChange={onTheme}>
          <SelectTrigger id="catalog-theme"
            className="h-8 w-55">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Dark</SelectLabel>
              {DARK.map((t) => (
                <SelectItem key={t.id}
                  value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Light</SelectLabel>
              {LIGHT.map((t) => (
                <SelectItem key={t.id}
                  value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Badge variant={theme.mode === 'dark' ? 'secondary' : 'outline'}>{theme.mode}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="catalog-transparency">Window transparency</Label>
        <Slider
          id="catalog-transparency"
          className="w-40"
          min={0}
          max={TRANSPARENCY_MAX}
          step={5}
          value={[transparency]}
          onValueChange={([value]) => onTransparency(value)}
        />
        <span className="w-8 text-2xs tabular-nums text-muted-foreground">{transparency}%</span>
      </div>
    </div>
  );
}

export const Provider: GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeId] = useState(() => initial('pd2theme', THEME_KEY) ?? DEFAULT_THEME_ID);
  const [transparency, setTransparency] = useState(() =>
    clampTransparency(Number(initial('pd2transparency', TRANSPARENCY_KEY) ?? 0)),
  );

  useEffect(() => {
    applyTheme(getTheme(themeId));
    localStorage.setItem(THEME_KEY, themeId);
  }, [themeId]);

  useEffect(() => {
    applyWindowTransparency(transparency);
    localStorage.setItem(TRANSPARENCY_KEY, String(transparency));
  }, [transparency]);

  return (
    <UiLabelsProvider labels={{}}>
      <TooltipProvider delayDuration={150}>
        <div className="pd2-catalog-backdrop">
          <CatalogToolbar
            themeId={themeId}
            onTheme={setThemeId}
            transparency={transparency}
            onTransparency={setTransparency}
          />
          <div className="p-6">{children}</div>
        </div>
        <Toaster theme={getTheme(themeId).mode} />
      </TooltipProvider>
    </UiLabelsProvider>
  );
};
