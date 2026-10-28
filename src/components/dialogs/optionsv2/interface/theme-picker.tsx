import React from 'react';
import { Check } from 'lucide-react';
import { useOptions } from '@/hooks/useOptions';
import { getTheme, Theme, THEMES, themeStyle } from '@/lib/themes';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { Trans, useTranslation } from '@/i18n';

type ModeFilter = 'all' | 'dark' | 'light';

const ARROW_STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Miniature overlay window rendered with the given theme's own tokens. */
function ThemePreview({ theme }: { theme: Theme }) {
  const { t } = useTranslation('settings');
  return (
    <div
      aria-hidden
      style={themeStyle(theme)}
      className="overflow-hidden rounded-md border border-border bg-background text-foreground"
    >
      <div className="flex h-5 items-center gap-1 border-b border-border bg-surface-elevated px-1.5">
        <span className="h-2 w-0.5 rounded-full bg-muted-foreground/60" />
        <span className="truncate text-[9px] font-medium text-surface-foreground">PD2 Trader</span>
        <span className="ml-auto size-1.5 rounded-full bg-muted-foreground/60" />
      </div>
      <div className="space-y-1.5 bg-surface p-1.5">
        <div
          className="space-y-0.5 rounded-sm border border-border bg-card px-1.5 py-1 text-[10px] leading-tight"
          style={{ fontFamily: 'DiabloFont' }}
        >
          <div className="truncate text-q-unique">Harlequin Crest</div>
          <div className="truncate text-q-set">Sigon&apos;s Visor</div>
          <div className="truncate text-q-magic">Jeweler&apos;s Monarch</div>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
            {t('theme.preview.list')}
          </span>
          <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[9px] text-secondary-foreground">
            {t('theme.preview.offers')}
          </span>
          <span className="ml-auto text-[9px] text-muted-foreground">
            <span className="text-q-gold">1.5</span> HR
          </span>
        </div>
      </div>
    </div>
  );
}

export function ThemePicker() {
  const { t } = useTranslation('settings');
  const { settings, isLoading, updateSettings } = useOptions();
  const [filter, setFilter] = React.useState<ModeFilter>('all');
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  if (isLoading || !settings) {
    return null;
  }

  const current = getTheme(settings.themeId);
  const visible = filter === 'all' ? THEMES : THEMES.filter((theme) => theme.mode === filter);
  // Roving tabindex: the checked option is the tab stop; fall back to the first visible one.
  const tabStopId = visible.some((theme) => theme.id === current.id) ? current.id : visible[0]?.id;

  const select = (id: string) => {
    if (id !== current.id) updateSettings({ themeId: id });
  };

  const onOptionKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | undefined;
    if (e.key in ARROW_STEP) next = (index + ARROW_STEP[e.key] + visible.length) % visible.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = visible.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    optionRefs.current[next]?.focus();
    select(visible[next].id);
  };

  return (
    <div className="flex flex-col gap-y-4 pr-2">
      <div className="flex items-center justify-between gap-4">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={filter}
          onValueChange={(value) => value && setFilter(value as ModeFilter)}
          aria-label={t('theme.filterLabel')}
        >
          <ToggleGroupItem value="all"
            className="px-3">
            {t('theme.filter.all')}
          </ToggleGroupItem>
          <ToggleGroupItem value="dark"
            className="px-3">
            {t('theme.filter.dark')}
          </ToggleGroupItem>
          <ToggleGroupItem value="light"
            className="px-3">
            {t('theme.filter.light')}
          </ToggleGroupItem>
        </ToggleGroup>
        <span className="truncate text-sm text-muted-foreground">
          <Trans
            t={t}
            i18nKey="theme.current"
            values={{ name: current.name }}
            components={{ name: <span className="font-medium text-foreground" /> }}
          />
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label={t('theme.groupLabel')}
        className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3"
      >
        {visible.map((theme, index) => {
          const checked = theme.id === current.id;
          return (
            <button
              key={theme.id}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={t('theme.optionLabel', {
                name: theme.name,
                mode: theme.mode === 'dark' ? t('theme.mode.dark') : t('theme.mode.light'),
              })}
              title={theme.description}
              tabIndex={theme.id === tabStopId ? 0 : -1}
              onClick={() => select(theme.id)}
              onKeyDown={(e) => onOptionKeyDown(e, index)}
              className={cn(
                'group relative flex flex-col gap-2 rounded-lg border border-border bg-card p-2 text-left outline-none',
                'transition-[transform,box-shadow,border-color] duration-(--dur-fast) ease-out',
                'hover:border-ring/50 hover:shadow-panel motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                checked && 'border-primary/70 shadow-glow ring-2 ring-primary/70',
              )}
            >
              <ThemePreview theme={theme} />
              <div className="flex items-center justify-between gap-2 px-0.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-card-foreground">{theme.name}</div>
                  <div className="text-xs capitalize text-muted-foreground">
                    {theme.mode === 'dark' ? t('theme.mode.dark') : t('theme.mode.light')}
                  </div>
                </div>
                <span
                  aria-hidden
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground',
                    'transition-[opacity,transform] duration-(--dur-med) ease-spring',
                    checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                  )}
                >
                  <Check className="size-3"
                    strokeWidth={3} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
