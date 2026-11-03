import React from 'react';
import type { TFunction } from 'i18next';
import { SlidersHorizontal } from 'lucide-react';
import { Switch } from '@pd2-trader/ui';
import { type ISettings, useOptions } from '@/hooks/useOptions';
import { useTranslation } from '@/i18n';
import { SETTINGS_SECTIONS } from '@/components/dialogs/optionsv2/settings-ui';
import { optionLabel, type SettingOption } from '@/components/dialogs/optionsv2/setting-options';
import type {
  PaletteAction,
  PaletteItem,
  PaletteRef,
  PaletteSource,
  PaletteSourceResult,
} from '@/pages/palette/lib/types';
import { bestTier, matchTier } from '../lib/match';
import { plainLabel, type SelectSetting, type SettingEntry, SETTINGS_REGISTRY } from './settings-registry';

/** Scope param of a select's option list: `setting:<key>`. */
const OPTIONS_PARAM = 'setting:';
const NOTHING: PaletteSourceResult = { items: [], loading: false };
const ICON = 'h-4 w-4';

interface Ctx {
  t: TFunction;
  settings: ISettings;
  updateSettings: (patch: Partial<ISettings>) => void;
}

/** A boolean setting's row end: a display-only switch (the row's Enter flips it). */
function settingSwitch(on: boolean, dimmed: boolean) {
  return <Switch checked={on}
    disabled={dimmed}
    tabIndex={-1}
    aria-hidden
    className="pointer-events-none" />;
}

const trailingText = (text: string) =>
  text ? <span className="max-w-44 truncate text-xs text-muted-foreground">{text}</span> : undefined;

const sectionOf = (entry: SettingEntry) => SETTINGS_SECTIONS.find((s) => s.id === entry.section)!;

const entryLabel = (ctx: Ctx, entry: SettingEntry) =>
  plainLabel(entry.label ? entry.label(ctx.t, ctx.settings) : ctx.t(entry.labelKey ?? ''));

const openAction = (ctx: Ctx, entry: SettingEntry): PaletteAction => ({
  id: 'open-settings',
  label: ctx.t('palette.openInSettings'),
  icon: <SlidersHorizontal className={ICON} />,
  run: (run) => run.openPanel('settings', { section: entry.section, field: entry.key }),
});

/** Sets a select to one of its options, as the form's select does (nothing when it is already the current one). */
function choose(ctx: Ctx, entry: SelectSetting, value: string) {
  if (value === entry.value(ctx.settings)) return;
  return ctx.updateSettings({ [entry.key]: entry.numeric ? Number(value) : value } as Partial<ISettings>);
}

function settingItem(ctx: Ctx, entry: SettingEntry): PaletteItem {
  const { t, settings } = ctx;
  const title = entryLabel(ctx, entry);
  const section = sectionOf(entry);
  const Icon = section.icon;
  const open = openAction(ctx, entry);
  const base = {
    ref: { id: `settings:${entry.key}`, group: 'settings', title, data: { key: entry.key } } satisfies PaletteRef,
    subtitle: t(section.titleKey),
    icon: <Icon className={ICON} />,
  };

  switch (entry.kind) {
    case 'boolean': {
      const on = entry.value(settings);
      const disabled = entry.disabled?.(settings) ?? false;
      return {
        ...base,
        trailing: settingSwitch(on, !!disabled),
        primary: disabled
          ? open
          : {
              id: 'toggle',
              label: on ? t('palette.turnOff') : t('palette.turnOn'),
              keepOpen: true,
              run: () => ctx.updateSettings({ [entry.key]: !on } as Partial<ISettings>),
            },
        actions: disabled ? undefined : [open],
      };
    }
    case 'select': {
      const current = entry.options(settings).find((option) => option.value === entry.value(settings));
      return {
        ...base,
        trailing: trailingText(current ? optionLabel(t, current) : ''),
        primary: {
          id: 'choose',
          label: t('palette.change'),
          keepOpen: true,
          run: (run) => run.scope({ group: 'settings', param: `${OPTIONS_PARAM}${entry.key}`, label: title }),
        },
        actions: [open],
      };
    }
    case 'open':
      return { ...base, trailing: trailingText(entry.trailing?.(t, settings) ?? ''), primary: open };
  }
}

function optionItem(ctx: Ctx, entry: SelectSetting, option: SettingOption): PaletteItem {
  const { t, settings } = ctx;
  const Icon = sectionOf(entry).icon;
  return {
    ref: {
      id: `settings:${entry.key}=${option.value}`,
      group: 'settings',
      title: optionLabel(t, option),
      data: { key: entry.key, value: option.value },
    },
    subtitle: entryLabel(ctx, entry),
    badge: option.value === entry.value(settings) ? t('palette.current') : undefined,
    icon: <Icon className={ICON} />,
    primary: { id: 'select', label: t('palette.select'), keepOpen: true, run: () => choose(ctx, entry, option.value) },
    actions: [openAction(ctx, entry)],
  };
}

/**
 * How well `query` matches a setting, higher is better (0: no match): its label as lib/match ranks it (equal, starts
 * with, a word starts with, contains), above a match in only its section, headings or keywords (one of them, or
 * every query word somewhere among them and the label).
 */
export function settingTier(label: string, extras: readonly string[], query: string): number {
  const tier = matchTier(label, query);
  if (tier > 0) return tier + 1;
  if (bestTier(extras, query) > 0) return 1;
  const haystack = [label, ...extras].join('\n').toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word))
    ? 1
    : 0;
}

/** The matching candidates, best tier first, keeping registry / option order within a tier. */
function ranked<T>(candidates: readonly T[], tierOf: (candidate: T) => number): T[] {
  return candidates
    .map((candidate, index) => ({ candidate, index, tier: tierOf(candidate) }))
    .filter((c) => c.tier > 0)
    .sort((a, b) => b.tier - a.tier || a.index - b.index)
    .map((c) => c.candidate);
}

function resolveRef(ctx: Ctx, entries: readonly SettingEntry[], ref: PaletteRef): PaletteItem | null {
  const entry = entries.find((e) => e.key === ref.data?.key);
  if (!entry) return null;
  const value = ref.data?.value;
  if (value === undefined || value === null) return settingItem(ctx, entry);
  if (entry.kind !== 'select') return null;
  const option = entry.options(ctx.settings).find((o) => o.value === String(value));
  return option ? optionItem(ctx, entry, option) : null;
}

/**
 * The palette's settings group: every setting of the Settings window by its label, section, headings and keywords.
 * Switches flip in place, selects drill into their options (scope `setting:<key>`), anything else opens Settings
 * on the row.
 */
export const useSettingsSource: PaletteSource = ({ query, scope, limit, refs }) => {
  const { t } = useTranslation('settings');
  const { settings, isLoading, updateSettings } = useOptions();

  return React.useMemo(() => {
    if (isLoading || !settings) return NOTHING;
    const ctx: Ctx = { t, settings, updateSettings };
    const entries = SETTINGS_REGISTRY.filter((entry) => entry.shown?.(settings) ?? true);

    // Drilled into a select: its options
    if (scope?.param?.startsWith(OPTIONS_PARAM)) {
      const key = scope.param.slice(OPTIONS_PARAM.length);
      const entry = entries.find((e): e is SelectSetting => e.kind === 'select' && e.key === key);
      if (!entry) return NOTHING;
      const options = entry.options(settings);
      const matching = query ? ranked(options, (o) => matchTier(optionLabel(t, o), query)) : options;
      return { items: matching.slice(0, limit).map((o) => optionItem(ctx, entry, o)), loading: false };
    }

    if (!query) {
      const items = refs.map((ref) => resolveRef(ctx, entries, ref)).filter((item) => item !== null);
      // Tab-scoped to settings with nothing typed: browse the rest after the recents and pins
      if (scope) {
        const listed = new Set(items.map((item) => item.ref.id));
        for (const entry of entries) {
          if (items.length >= limit) break;
          const item = settingItem(ctx, entry);
          if (!listed.has(item.ref.id)) items.push(item);
        }
      }
      return { items: items.slice(0, limit), loading: false };
    }

    const matching = ranked(entries, (entry) =>
      settingTier(
        entryLabel(ctx, entry),
        [t(sectionOf(entry).titleKey), ...(entry.groupKeys ?? []).map((key) => t(key)), ...(entry.keywords ?? [])],
        query,
      ),
    );
    return { items: matching.slice(0, limit).map((entry) => settingItem(ctx, entry)), loading: false };
  }, [query, scope, limit, refs, settings, isLoading, t, updateSettings]);
};
