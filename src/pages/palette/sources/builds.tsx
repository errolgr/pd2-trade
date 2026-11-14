import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ExternalLink, Star, StarOff, User } from 'lucide-react';
import { TombGlyph } from '@/components/glyph/TombGlyph';
import { characterSkillMap } from '@/assets/character-skills';
import {
  type AccountCharacter,
  BuildsApiError,
  type BuildsMode,
  type BuildSuggestResponse,
  getAccountCharacters,
  suggestBuilds,
} from '@/lib/builds-api';
import { reportApiError } from '@/lib/error-reporting';
import { glyphCodeForName } from '@/lib/glyph-code';
import { openUrl } from '@/lib/browser-opener';
import { type BuildCharacterRef, type ISettings, useOptions } from '@/hooks/useOptions';
import type { TFunction } from 'i18next';
import { currentLocale, useTranslation } from '@/i18n';
import { CLASS_META, characterSiteUrl, classMeta, skillFilter } from '@/pages/builds/lib/format';
import { isFollowed, toggleFollow } from '@/pages/builds/lib/character-refs';
import { ClassEmblem, SkillIcon } from '@/pages/builds/components/parts';
import {
  PALETTE_DEBOUNCE_MS,
  PALETTE_REMOTE_MIN_CHARS,
  type PaletteItem,
  type PaletteRef,
  type PaletteSource,
} from '../lib/types';

/**
 * The palette's builds group: classes and skills (local, instant; Meta filtered by them), tracked characters and
 * accounts (server suggest, debounced), and an account's characters when scoped to `account:<name>`.
 */

/** Characters / accounts asked of the server per query; the shell's limit slices them. */
const SUGGEST_LIMIT = 20;
/** Queries (and accounts) whose answers are kept for the session (oldest dropped first). */
const CACHE_MAX = 100;
const ACCOUNT_PARAM = 'account:';
const ICON_SIZE = 20;

// ───────────────────────────── local: classes and skills ─────────────────────────────

export type LocalKind = 'class' | 'skill';

export interface LocalEntry {
  kind: LocalKind;
  /** Class name, or the skill's name as PD2 (and the Meta tab's skill filter) spells it. */
  value: string;
  className: string;
  nicknames: string[];
}

/** character-skills.ts names that PD2's character API (and so the builds server) spells differently. */
const SKILL_DISPLAY_NAMES: Record<string, string> = {
  Dopplezon: 'Decoy',
  AmpDmg: 'Amplify Damage',
  BloodGolem: 'Blood Golem',
  IronGolem: 'Iron Golem',
  FireGolem: 'Fire Golem',
  LowRes: 'Lower Resist',
  CurMas: 'Curse Mastery',
  'General Mastery': 'One Hand Mastery',
  'Pole Arm and Spear Mastery': 'Two Hand Mastery',
  Berserk: 'Berserker',
  'Plague Poppy': 'Poison Creeper',
  Wearwolf: 'Werewolf',
  Wearbear: 'Werebear',
  'Shape Shifting': 'Lycanthropy',
  'Cycle of Life': 'Solar Creeper',
  Eruption: 'Fissure',
  'Summon Fenris': 'Summon Dire Wolf',
  Vines: 'Carrion Vine',
  'Fire Trauma': 'Fire Blast',
  'Shock Field': 'Shock Web',
  Quickness: 'Burst of Speed',
  'Wake of Fire Sentry': 'Wake of Fire',
  'Inferno Sentry': 'Wake of Inferno',
  'Royal Strike': 'Phoenix Strike',
};

/** Community names → a class or a skill (the skill's class is implied). */
const NICKNAMES: Record<string, { kind: LocalKind; value: string }> = {
  ama: { kind: 'class', value: 'Amazon' },
  zon: { kind: 'class', value: 'Amazon' },
  sin: { kind: 'class', value: 'Assassin' },
  assa: { kind: 'class', value: 'Assassin' },
  barb: { kind: 'class', value: 'Barbarian' },
  dru: { kind: 'class', value: 'Druid' },
  necro: { kind: 'class', value: 'Necromancer' },
  nec: { kind: 'class', value: 'Necromancer' },
  pala: { kind: 'class', value: 'Paladin' },
  pally: { kind: 'class', value: 'Paladin' },
  sorc: { kind: 'class', value: 'Sorceress' },
  sorceror: { kind: 'class', value: 'Sorceress' },
  hammerdin: { kind: 'skill', value: 'Blessed Hammer' },
  hdin: { kind: 'skill', value: 'Blessed Hammer' },
  fohdin: { kind: 'skill', value: 'Fist of the Heavens' },
  foh: { kind: 'skill', value: 'Fist of the Heavens' },
  zealot: { kind: 'skill', value: 'Zeal' },
  smiter: { kind: 'skill', value: 'Smite' },
  javazon: { kind: 'skill', value: 'Lightning Fury' },
  java: { kind: 'skill', value: 'Lightning Fury' },
  strafazon: { kind: 'skill', value: 'Strafe' },
  trapsin: { kind: 'skill', value: 'Lightning Sentry' },
  bonemancer: { kind: 'skill', value: 'Bone Spear' },
  summonmancer: { kind: 'skill', value: 'Raise Skeleton' },
  fishymancer: { kind: 'skill', value: 'Raise Skeleton' },
  pnova: { kind: 'skill', value: 'Poison Nova' },
  ww: { kind: 'skill', value: 'Whirlwind' },
  wwbarb: { kind: 'skill', value: 'Whirlwind' },
  bo: { kind: 'skill', value: 'Battle Orders' },
  fo: { kind: 'skill', value: 'Frozen Orb' },
  blizz: { kind: 'skill', value: 'Blizzard' },
  windy: { kind: 'skill', value: 'Tornado' },
  winddruid: { kind: 'skill', value: 'Tornado' },
};

/** Lowercase words: "Fist of the Heavens" → "fist of the heavens"; apostrophes dropped. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const compact = (s: string) => s.replace(/ /g, '');

function buildIndex(): LocalEntry[] {
  const entries: LocalEntry[] = CLASS_META.map((c) => ({ kind: 'class', value: c.name, className: c.name, nicknames: [] }));
  const seen = new Set<string>();
  for (const skill of Object.values(characterSkillMap)) {
    if (!skill.class || /temp\d$/i.test(skill.name)) continue;
    const value = SKILL_DISPLAY_NAMES[skill.name] ?? skill.name;
    if (seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    entries.push({ kind: 'skill', value, className: classMeta(skill.class).name, nicknames: [] });
  }
  const byKey = new Map(entries.map((e) => [`${e.kind}:${e.value.toLowerCase()}`, e]));
  for (const [nick, target] of Object.entries(NICKNAMES)) {
    byKey.get(`${target.kind}:${target.value.toLowerCase()}`)?.nicknames.push(nick);
  }
  return entries;
}

const INDEX = buildIndex();
const INDEX_BY_KEY = new Map(INDEX.map((e) => [`${e.kind}:${e.value.toLowerCase()}`, e]));

export interface LocalMatch {
  entry: LocalEntry;
  /** The query is the name or a nickname. */
  exact: boolean;
  /** Lower is better (exact = 0). */
  rank: number;
  /** The nickname that matched. */
  badge?: string;
}

function matchEntry(entry: LocalEntry, q: string, qc: string): LocalMatch | null {
  const name = norm(entry.value);
  if (name === q || compact(name) === qc) return { entry, exact: true, rank: 0 };
  const nick = entry.nicknames.find((n) => n === qc);
  if (nick) return { entry, exact: true, rank: 0, badge: nick };
  if (q.length < 2) return null;
  if (name.startsWith(q)) return { entry, exact: false, rank: 1 };
  if (name.split(' ').some((w) => w.startsWith(q)) || compact(name).startsWith(qc)) {
    return { entry, exact: false, rank: 2 };
  }
  const nickPrefix = entry.nicknames.find((n) => n.startsWith(qc));
  if (nickPrefix) return { entry, exact: false, rank: 3, badge: nickPrefix };
  if (q.length >= 3 && compact(name).includes(qc)) return { entry, exact: false, rank: 4 };
  return null;
}

/** Classes and skills matching `query`: exact (name or nickname) first, then the rest by how well they match. */
export function matchLocal(query: string): LocalMatch[] {
  const q = norm(query);
  if (!q) return [];
  const qc = compact(q);
  const matches = INDEX.flatMap((entry) => matchEntry(entry, q, qc) ?? []);
  return matches.sort(
    (a, b) =>
      a.rank - b.rank ||
      (a.entry.kind === b.entry.kind ? 0 : a.entry.kind === 'class' ? -1 : 1) ||
      a.entry.value.localeCompare(b.entry.value),
  );
}

// ───────────────────────────── remote: suggest and account characters ─────────────────────────────

const suggestCache = new Map<string, BuildSuggestResponse>();
const accountCache = new Map<string, AccountCharacter[] | null>();
const reported = { suggest: false, account: false };

/** Tests: forget cached answers and reported failures. */
export function resetBuildsSource(): void {
  suggestCache.clear();
  accountCache.clear();
  reported.suggest = false;
  reported.account = false;
}

function remember<T>(cache: Map<string, T>, key: string, value: T) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

/** The first failure of each lookup per session is reported; the group just answers without it. */
function reportOnce(kind: keyof typeof reported, error: unknown, endpoint: string, context: Record<string, string>) {
  if (reported[kind]) return;
  reported[kind] = true;
  const err = error instanceof Error ? error : new Error(String(error));
  reportApiError(err, 'builds-api', endpoint, err instanceof BuildsApiError ? err.status : undefined, context);
}

interface Pending {
  key: string;
  done: boolean;
}

/** Asks the server once typing pauses; a newer query cancels the request in flight. */
function useSuggest(key: string | null): { data: BuildSuggestResponse | null; loading: boolean } {
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    if (!key || suggestCache.has(key)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPending({ key, done: false });
      suggestBuilds(key, { limit: SUGGEST_LIMIT }, controller.signal).then(
        (result) => {
          if (controller.signal.aborted) return;
          remember(suggestCache, key, result);
          setPending({ key, done: true });
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          reportOnce('suggest', error, 'api/builds/suggest', { query: key });
          setPending({ key, done: true });
        },
      );
    }, PALETTE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key]);
  if (!key) return { data: null, loading: false };
  const data = suggestCache.get(key) ?? null;
  return { data, loading: !data && pending?.key === key && !pending.done };
}

/** An account's characters, live from PD2; null = unknown account (or not loaded). */
function useAccountCharacters(account: string | null): { data: AccountCharacter[] | null; loading: boolean } {
  const key = account?.toLowerCase() ?? null;
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    if (!account || !key || accountCache.has(key)) return;
    const controller = new AbortController();
    setPending({ key, done: false });
    getAccountCharacters(account, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        remember(accountCache, key, result);
        setPending({ key, done: true });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        reportOnce('account', error, 'game/account/:account', { account });
        setPending({ key, done: true });
      },
    );
    return () => controller.abort();
  }, [account, key]);
  if (!key) return { data: null, loading: false };
  const cached = accountCache.has(key);
  return { data: accountCache.get(key) ?? null, loading: !cached && pending?.key === key && !pending.done };
}

// ───────────────────────────── rows ─────────────────────────────

interface RowDeps {
  t: TFunction;
  followed: BuildCharacterRef[];
  updateSettings: (patch: Partial<ISettings>) => void;
}

interface CharacterRow {
  name: string;
  mode: BuildsMode;
  level?: number | null;
  className?: string | null;
}

function CharacterTrailing({ t, level, className, mode }: { t: TFunction } & Omit<CharacterRow, 'name'>) {
  const meta = className ? classMeta(className) : null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {mode === 'hardcore' && (
        <span className="rounded border border-destructive/40 px-1 text-[10px] leading-4 font-semibold text-destructive">
          {t('palette.hardcore')}
        </span>
      )}
      {level != null && <span className="tabular-nums">{t('meta.lv', { level })}</span>}
      {meta && <span style={{ color: meta.color }}>{meta.name}</span>}
    </span>
  );
}

function characterItem(c: CharacterRow, { t, followed, updateSettings }: RowDeps): PaletteItem {
  const charRef: BuildCharacterRef = { name: c.name, mode: c.mode };
  const following = isFollowed(followed, charRef);
  const hasTrailing = c.mode === 'hardcore' || c.level != null || !!c.className;
  return {
    ref: {
      id: `builds:character:${c.mode}:${c.name.toLowerCase()}`,
      group: 'builds',
      title: c.name,
      data: { name: c.name, mode: c.mode, level: c.level ?? null, className: c.className ?? null },
    },
    subtitle: t('palette.character'),
    icon: c.className ? <ClassEmblem className={c.className}
      size={ICON_SIZE} /> : <User className="size-4" />,
    trailing: hasTrailing ? <CharacterTrailing t={t}
      level={c.level}
      className={c.className}
      mode={c.mode} /> : undefined,
    primary: {
      id: 'open',
      label: t('palette.openBuild'),
      run: (ctx) => ctx.openPanel('builds', { character: { name: c.name, mode: c.mode } }),
    },
    actions: [
      {
        id: 'follow',
        label: following ? t('characters.unfollow') : t('character.follow'),
        icon: following ? <StarOff className="size-4" /> : <Star className="size-4" />,
        keepOpen: true,
        run: () => updateSettings({ followedBuildCharacters: toggleFollow(followed, charRef) }),
      },
      {
        id: 'site',
        label: t('character.openSite'),
        icon: <ExternalLink className="size-4" />,
        run: () => void openUrl(characterSiteUrl(c.name)),
      },
    ],
  };
}

function accountItem(account: string, characters: number | null, t: TFunction): PaletteItem {
  return {
    ref: { id: `builds:account:${account.toLowerCase()}`, group: 'builds', title: account, data: { account, characters } },
    subtitle: t('palette.account'),
    icon: <TombGlyph code={glyphCodeForName(account)}
      size={ICON_SIZE} />,
    trailing:
      characters != null ? (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
          {t('characters.count', { count: characters, formatted: characters.toLocaleString(currentLocale()) })}
          <ChevronRight className="size-3.5" />
        </span>
      ) : (
        <ChevronRight className="size-3.5 text-muted-foreground" />
      ),
    primary: {
      id: 'characters',
      label: t('palette.showCharacters'),
      keepOpen: true,
      run: (ctx) => ctx.scope({ group: 'builds', param: `${ACCOUNT_PARAM}${account}`, label: account }),
    },
  };
}

function localItem(entry: LocalEntry, t: TFunction, badge?: string): PaletteItem {
  const isClass = entry.kind === 'class';
  return {
    ref: {
      id: `builds:${entry.kind}:${entry.value}`,
      group: 'builds',
      title: entry.value,
      data: { kind: entry.kind, value: entry.value },
    },
    subtitle: isClass ? t('palette.class') : t('palette.skillOf', { className: entry.className }),
    badge,
    icon: isClass ? <ClassEmblem className={entry.value}
      size={ICON_SIZE} /> : <SkillIcon name={entry.value}
        size={ICON_SIZE} />,
    primary: {
      id: 'meta',
      label: t('palette.showMeta'),
      run: (ctx) =>
        ctx.openPanel('builds', {
          tab: 'meta',
          filters: isClass
            ? { classes: [entry.value] }
            : { classes: [entry.className], skills: [skillFilter(entry.value)] },
        }),
    },
  };
}

const isMode = (v: unknown): v is BuildsMode => v === 'softcore' || v === 'hardcore';
const str = (v: unknown) => (typeof v === 'string' && v ? v : null);

/** A recent / pinned ref back into its row; null when it no longer resolves. */
function resolveRef(ref: PaletteRef, deps: RowDeps): PaletteItem | null {
  const d = ref.data ?? {};
  if (ref.id.startsWith('builds:character:')) {
    const name = str(d.name);
    if (!name || !isMode(d.mode)) return null;
    return characterItem(
      { name, mode: d.mode, level: typeof d.level === 'number' ? d.level : null, className: str(d.className) },
      deps,
    );
  }
  if (ref.id.startsWith('builds:account:')) {
    const account = str(d.account);
    return account ? accountItem(account, typeof d.characters === 'number' ? d.characters : null, deps.t) : null;
  }
  if ((d.kind === 'class' || d.kind === 'skill') && typeof d.value === 'string') {
    const entry = INDEX_BY_KEY.get(`${d.kind}:${d.value.toLowerCase()}`);
    return entry ? localItem(entry, deps.t) : null;
  }
  return null;
}

// ───────────────────────────── source ─────────────────────────────

export const useBuildsSource: PaletteSource = ({ query, scope, limit, refs }) => {
  const { t } = useTranslation('builds');
  const { settings, updateSettings } = useOptions();
  const followed = settings?.followedBuildCharacters;
  const account = scope?.param?.startsWith(ACCOUNT_PARAM) ? scope.param.slice(ACCOUNT_PARAM.length) || null : null;
  const suggestKey = !account && query.length >= PALETTE_REMOTE_MIN_CHARS ? query.toLowerCase() : null;
  const suggest = useSuggest(suggestKey);
  const accountChars = useAccountCharacters(account);

  const items = useMemo(() => {
    const deps: RowDeps = { t, followed: followed ?? [], updateSettings };
    if (account) {
      const needle = query.toLowerCase();
      return (accountChars.data ?? [])
        .filter((c) => c.name.toLowerCase().includes(needle))
        .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
        .slice(0, limit)
        .map((c) =>
          characterItem(
            { name: c.name, mode: c.hardcore ? 'hardcore' : 'softcore', level: c.level, className: c.className },
            deps,
          ),
        );
    }
    if (!query) return refs.flatMap((ref) => resolveRef(ref, deps) ?? []).slice(0, limit);
    const local = matchLocal(query);
    const remote = suggest.data;
    return [
      ...local.filter((m) => m.exact).map((m) => localItem(m.entry, t, m.badge)),
      ...(remote?.characters ?? []).map((c) =>
        characterItem(
          { name: c.name, mode: c.isHardcore ? 'hardcore' : 'softcore', level: c.level, className: c.className },
          deps,
        ),
      ),
      ...(remote?.accounts ?? []).map((a) => accountItem(a.account, a.characters, t)),
      ...local.filter((m) => !m.exact).map((m) => localItem(m.entry, t, m.badge)),
    ].slice(0, limit);
  }, [t, followed, updateSettings, account, accountChars.data, query, refs, limit, suggest.data]);

  return { items, loading: account ? accountChars.loading : suggest.loading };
};
