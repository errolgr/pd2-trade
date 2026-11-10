export interface Range {
  min?: number;
  max?: number;
  /** Damage lines: the max damage's range, as PD2 shows it ("[a - b to c - d]"). */
  to?: { min: number; max: number };
  /** Per-level stat (value per character level, shown with decimals); never clamps a filter. */
  perLevel?: boolean;
}

export interface Stat {
  stat_id: number;
  name: string;
  value?: number;
  range?: Range;
  level?: number;
  corrupted?: boolean; // whether this stat is corrupted
  chance?: number;
  skill?: string; // skill name for skill stats
  /**
   * Auras, chance to cast, charges (skillParamRow): the skill the market modifier pins, by id (the skill and any
   * proc of it, which share a name) or, when no id is known, by the market line (`line`, a regex source).
   */
  skillParam?: { name: string; ids: number[]; line: string };
  /** Charged skills: "(25/31 Charges)" (BH exports them without a name). */
  charges?: string;
  /** Damage pair rows ("Adds 4-14 fire damage"): `value` is the min damage, this the max. */
  maxValue?: number;
  /** Damage pair rows: the max damage's range. */
  maxRange?: Range;
  /** Poison damage rows: the duration in seconds. */
  seconds?: number;
  /** The Corrupted pseudo-row of a corruptable item that isn't corrupted. */
  _injected?: boolean;
  /** Σ rows (stat_id StatId.Pseudo): the market pseudo stat id, e.g. `pseudo_total_res`. */
  pseudo?: string;
  /** Σ rows: the item's rows the total folds in (shown as its summary). */
  folded?: Stat[];
}

/** Min/max inputs of a selected stat row; damage pair rows add a second pair for the max damage. */
export interface StatFilterInput {
  value?: string;
  min?: string;
  max?: string;
  maxMin?: string;
  maxMax?: string;
}

export interface Socketed {
  name?: string;
  quality: string;
  type: string;
  stats?: Stat[];
  iLevel: number;
  isRune?: boolean;
}

export interface Item {
  name?: string;
  isRuneword?: boolean;
  isEthereal?: boolean;
  runeword?: string;
  quality: string;
  type: string;
  defense?: number;
  iLevel: number;
  sockets?: number;
  socketed?: Socketed[];
  stats: Stat[];
  location?: string;
  /** Set items: the set's name. */
  set?: string;
}
export interface StatOverride {
  name: string;
  displayValue: boolean;
  hasFilter: boolean; // whether this stat can be filtered
}
