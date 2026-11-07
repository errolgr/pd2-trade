/**
 * Shared Horadric Sim handoffs: one item sent to the planner (price check Sim button, try-on hotkey), a market
 * listing opened on a character (market Sim, chat Try on), and the default character those use.
 */
import type { GameData } from '@/common/types/pd2-website/GameStashResponse';
import { openUrl } from '@/lib/browser-opener';
import { BACKEND_URL } from '@/lib/pkce';
import { getSimLadderCharacters, preferredSimCharacter } from '@/lib/sim-characters';
import { createSimExport, describeSimExportError, SimExportApiError, type SimExportItems } from '@/lib/sim-export-api';
import { findSimItem, type FoundSimItem } from '@/lib/sim-item-sources';
import { legacySimCharacter, type SimGoal, type SimLastExport } from '@/lib/sim-preferences';
import { trackMeasurement } from '@/lib/telemetry';
import { cleanItemType } from '@/pages/price-check/lib/utils';
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';

/** Tried on in its slot (Quick Sim), or only a Top Gear candidate. */
export type SimItemMode = 'try' | 'pool';

/** Where an item export started, for telemetry. */
export type SimItemExportSource = 'price_check' | 'hotkey';

export const simGoalForMode = (mode: SimItemMode): SimGoal => (mode === 'try' ? 'quick_sim' : 'top_gear');

/** The export body for one item: PD2's copy when `found`, else the item as copied (the server converts it). */
export function simItemExport(item: PriceCheckItem, found: FoundSimItem | null, mode: SimItemMode): SimExportItems {
  const tried = mode === 'try';
  return found
    ? { stashItems: [found.item], ...(tried && { try: { stash: 0 } }) }
    : { clipboardItems: [item], ...(tried && { try: { clipboard: 0 } }) };
}

/**
 * Sends one item with `character` to the planner and opens the planner link in the browser; resolves with what
 * to remember as Settings `simLastExport`. Throws (after telemetry) when the export or the browser fails.
 */
export async function sendItemToSim({
  token,
  character,
  item,
  found,
  mode,
  source,
}: {
  token: string;
  character: string;
  item: PriceCheckItem;
  found: FoundSimItem | null;
  mode: SimItemMode;
  source: SimItemExportSource;
}): Promise<SimLastExport> {
  const goal = simGoalForMode(mode);
  const itemSource = found?.source ?? 'clipboard';
  const started = performance.now();
  try {
    const { url } = await createSimExport(token, character, simItemExport(item, found, mode), goal);
    await openUrl(url);
    trackMeasurement(
      'sim_export',
      { duration_ms: performance.now() - started, stash_items: 1 },
      { outcome: 'success', source, mode, item_source: itemSource },
    );
    return { character, goal, items: 1, url, sentAt: new Date().toISOString() };
  } catch (error) {
    trackMeasurement(
      'sim_export',
      { duration_ms: performance.now() - started, stash_items: 1 },
      {
        outcome: 'error',
        source,
        mode,
        item_source: itemSource,
        status: error instanceof SimExportApiError ? error.status : undefined,
      },
    );
    throw error;
  }
}

/** The planner opened on `character` with a market listing added (`goal` preselected unless Quick Sim). */
export function simListingPlanUrl(listingId: string, character: string, goal?: SimGoal): string {
  const params = new URLSearchParams({ listing: listingId, import: character });
  if (goal && goal !== 'quick_sim') params.set('goal', goal);
  return `${BACKEND_URL}/sim/plan?${params}`;
}

/** The planner opened on `character` alone (it imports the character from PD2), `goal` preselected unless Quick Sim. */
export function simPlannerUrl(character: string, goal?: SimGoal): string {
  const params = new URLSearchParams({ import: character });
  if (goal && goal !== 'quick_sim') params.set('goal', goal);
  return `${BACKEND_URL}/sim/plan?${params}`;
}

/** The saved default character (Settings, else the one the price check remembered); '' when none. */
export function savedSimCharacter(settings: { simCharacter?: string }): string {
  return settings.simCharacter || legacySimCharacter();
}

/**
 * The character a one-press handoff uses: the saved default, else the user's first ladder character (the selected
 * account's highest level); '' when the user has none.
 */
export async function defaultSimCharacter(
  token: string,
  settings: { simCharacter?: string; account?: string },
): Promise<string> {
  const saved = savedSimCharacter(settings);
  if (saved) return saved;
  return preferredSimCharacter(await getSimLadderCharacters(token, settings.account ?? ''), '');
}

/** What a toast calls the item: its name, else its base type. */
export function simItemLabel(item: PriceCheckItem): string {
  return item.name?.trim() || cleanItemType(item.type ?? '') || 'item';
}

export interface SimTryOnDeps {
  /** PD2 token; null signed out. */
  token: string | null;
  account?: string;
  simCharacter?: string;
  /** Horadric Sim beta access: undefined unknown, null sim off. */
  canUse: boolean | null | undefined;
  /** The user's shared stash (PD2's copy of the item is looked for there and on the character). */
  stash: () => Promise<GameData>;
  notify(toast: { title: string; description?: string; variant?: 'error' | 'info' }): void;
  /** The export opened: remember it (Settings `simLastExport`). */
  onSent(sent: SimLastExport): void;
}

/**
 * The try-on hotkey's action for a copied item: on the default character, tried on in its slot (Quick Sim), the
 * planner opens in the browser. Like the price check's Sim button, PD2's copy of the item is sent when PD2 has one.
 */
export async function tryOnItem(item: PriceCheckItem, deps: SimTryOnDeps): Promise<void> {
  if (!deps.canUse) {
    deps.notify({
      title: 'Horadric Sim',
      description:
        deps.canUse === false
          ? 'Horadric Sim is in closed beta. Join the waitlist from the Sim button in the price check.'
          : 'Horadric Sim is not available right now.',
      variant: 'error',
    });
    return;
  }
  if (!deps.token) {
    deps.notify({ title: 'Horadric Sim', description: 'Sign in to try items on your character.', variant: 'error' });
    return;
  }
  const token = deps.token;
  try {
    const character = await defaultSimCharacter(token, deps);
    if (!character) {
      deps.notify({
        title: 'Horadric Sim',
        description: 'No ladder characters found on your PD2 accounts.',
        variant: 'error',
      });
      return;
    }
    deps.notify({ title: `Trying ${simItemLabel(item)} on ${character}…`, variant: 'info' });
    // A source PD2 can't read sends the item as copied, like the price check does
    const found = await findSimItem(item, { stash: deps.stash, characters: [character] }).catch(() => null);
    deps.onSent(await sendItemToSim({ token, character, item, found, mode: 'try', source: 'hotkey' }));
  } catch (error) {
    deps.notify({ title: 'Horadric Sim', description: describeSimExportError(error), variant: 'error' });
  }
}
