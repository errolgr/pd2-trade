/**
 * Minimal semver for manifests: strict `x.y.z(-pre)?` versions and ranges of space-separated comparators
 * (`^1.2.0`, `~1.2.0`, `>=1.0.0 <2.0.0`, `1.2.3`, `1.x`, `*`), alternatives joined with `||`.
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  pre: string[];
}

const VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function parseVersion(version: string): SemVer | null {
  const m = VERSION_RE.exec(version.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ? m[4].split('.') : [] };
}

export function isValidVersion(version: string): boolean {
  return parseVersion(version) !== null;
}

function comparePre(a: string[], b: string[]): number {
  if (!a.length || !b.length) return a.length ? -1 : b.length ? 1 : 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === undefined) return -1;
    if (b[i] === undefined) return 1;
    const an = /^\d+$/.test(a[i]);
    const bn = /^\d+$/.test(b[i]);
    if (an && bn) {
      const d = Number(a[i]) - Number(b[i]);
      if (d) return d;
    } else if (an !== bn) return an ? -1 : 1;
    else if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

export function compareVersions(a: SemVer | string, b: SemVer | string): number {
  const x = typeof a === 'string' ? parseVersion(a) : a;
  const y = typeof b === 'string' ? parseVersion(b) : b;
  if (!x || !y) throw new Error(`Invalid version: ${!x ? a : b}`);
  return x.major - y.major || x.minor - y.minor || x.patch - y.patch || comparePre(x.pre, y.pre);
}

type Comparator = { op: '>=' | '>' | '<=' | '<' | '='; v: SemVer };

const PARTIAL_RE = /^(\*|x|X|0|[1-9]\d*)(?:\.(\*|x|X|0|[1-9]\d*))?(?:\.(\*|x|X|0|[1-9]\d*))?(?:-([0-9A-Za-z.-]+))?$/;
const isWild = (part: string | undefined) => part === undefined || part === '*' || part === 'x' || part === 'X';
const v = (major: number, minor = 0, patch = 0, pre: string[] = []): SemVer => ({ major, minor, patch, pre });

/** Expands one range token into comparators; null when it is not a valid comparator. */
function parseComparator(token: string): Comparator[] | null {
  const m = /^(\^|~|>=|<=|>|<|=)?(.+)$/.exec(token);
  if (!m) return null;
  const op = m[1] ?? '';
  const p = PARTIAL_RE.exec(m[2]);
  if (!p) return null;
  if (isWild(p[1])) return op === '' || op === '=' || op === '>=' ? [] : null;
  const major = Number(p[1]);
  const minorWild = isWild(p[2]);
  const patchWild = minorWild || isWild(p[3]);
  const minor = minorWild ? 0 : Number(p[2]);
  const patch = patchWild ? 0 : Number(p[3]);
  const pre = p[4] ? p[4].split('.') : [];
  if (pre.length && patchWild) return null;
  const base = v(major, minor, patch, pre);
  const upper = (): SemVer => (minorWild ? v(major + 1) : patchWild ? v(major, minor + 1) : v(major, minor, patch + 1));
  switch (op) {
    case '^': {
      const hi = major > 0 || minorWild ? v(major + 1) : minor > 0 || patchWild ? v(0, minor + 1) : v(0, 0, patch + 1);
      return [
        { op: '>=', v: base },
        { op: '<', v: hi },
      ];
    }
    case '~':
      return [
        { op: '>=', v: base },
        { op: '<', v: minorWild ? v(major + 1) : v(major, minor + 1) },
      ];
    case '':
    case '=':
      return minorWild || patchWild
        ? [
            { op: '>=', v: base },
            { op: '<', v: upper() },
          ]
        : [{ op: '=', v: base }];
    case '>=':
      return [{ op: '>=', v: base }];
    case '>':
      return minorWild || patchWild ? [{ op: '>=', v: upper() }] : [{ op: '>', v: base }];
    case '<':
      return [{ op: '<', v: base }];
    case '<=':
      return minorWild || patchWild ? [{ op: '<', v: upper() }] : [{ op: '<=', v: base }];
  }
  return null;
}

function parseRange(range: string): Comparator[][] | null {
  const sets: Comparator[][] = [];
  for (const alt of range.split('||')) {
    const tokens = alt.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return null;
    const set: Comparator[] = [];
    for (const token of tokens) {
      const comps = parseComparator(token);
      if (!comps) return null;
      set.push(...comps);
    }
    sets.push(set);
  }
  return sets;
}

export function isValidRange(range: string): boolean {
  return range.trim().length > 0 && range.length <= 64 && parseRange(range) !== null;
}

/** True when `version` satisfies `range`. Prereleases only match comparators on the same x.y.z. */
export function satisfies(version: string, range: string): boolean {
  const ver = parseVersion(version);
  const sets = parseRange(range);
  if (!ver || !sets) return false;
  return sets.some((set) => {
    if (
      ver.pre.length &&
      !set.some((c) => c.v.pre.length && c.v.major === ver.major && c.v.minor === ver.minor && c.v.patch === ver.patch)
    )
      return false;
    return set.every(({ op, v: c }) => {
      const d = compareVersions(ver, c);
      return op === '>=' ? d >= 0 : op === '>' ? d > 0 : op === '<=' ? d <= 0 : op === '<' ? d < 0 : d === 0;
    });
  });
}
