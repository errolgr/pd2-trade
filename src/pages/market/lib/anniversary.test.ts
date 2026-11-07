import { describe, expect, it } from 'vitest';
import { ANNIVERSARY_KEY, anniversaryTri, withAnniversary } from './anniversary';
import type { StatFilter } from './types';

const life: StatFilter = { id: 'life', kind: 'mod', key: 'maxhp', min: 40, enabled: true };
const row = (over: Partial<StatFilter> = {}): StatFilter => ({
  id: 'a',
  kind: 'mod',
  key: ANNIVERSARY_KEY,
  enabled: true,
  ...over,
});

describe('anniversary skin filter', () => {
  it('stores yes as a required row and no as an excluded row, replacing the previous one and keeping other rows', () => {
    const yes = withAnniversary([life], 'yes');
    expect(yes).toMatchObject([life, { kind: 'mod', key: ANNIVERSARY_KEY, enabled: true }]);
    expect(yes[1].not).toBeUndefined();
    expect(anniversaryTri(yes)).toBe('yes');

    const no = withAnniversary(yes, 'no');
    expect(no).toMatchObject([life, { kind: 'mod', key: ANNIVERSARY_KEY, not: true }]);
    expect(anniversaryTri(no)).toBe('no');

    expect(withAnniversary(no, 'any')).toEqual([life]);
  });

  it('reads rows added in the stat list too; disabled rows and any-of rows decide nothing', () => {
    expect(anniversaryTri([life])).toBe('any');
    expect(anniversaryTri([life, row()])).toBe('yes');
    expect(anniversaryTri([row({ not: true })])).toBe('no');
    expect(anniversaryTri([row({ enabled: false })])).toBe('any');
    expect(anniversaryTri([row({ or: 1 })])).toBe('any');
    // Picking a value drops such rows instead of leaving a second, conflicting one
    expect(withAnniversary([row({ or: 1 }), life], 'any')).toEqual([life]);
  });
});
