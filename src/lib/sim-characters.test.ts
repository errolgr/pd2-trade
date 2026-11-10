import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccountCharacters } from '@/lib/builds-api';
import { getMyCharacters } from '@/lib/sim-export-api';
import { getSimLadderCharacters, preferredSimCharacter, type SimCharacter } from './sim-characters';

vi.mock('@/lib/builds-api', () => ({ getAccountCharacters: vi.fn() }));
vi.mock('@/lib/sim-export-api', () => ({ getMyCharacters: vi.fn() }));

const pd2 = (account: string, name: string, level: number, ladder: boolean, hardcore = false) => ({
  account,
  name,
  className: 'Paladin',
  level,
  hardcore,
  ladder,
});

describe('getSimLadderCharacters', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(getMyCharacters).mockResolvedValue({
      accounts: [
        { account: 'Mules', characters: ['mulea', 'muleb'] },
        { account: 'Main', characters: ['lowpal', 'hammer', 'oldhammer', 'hcpal', 'gone'] },
      ],
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps ladder characters (softcore and hardcore), selected account first, highest level first', async () => {
    vi.mocked(getAccountCharacters).mockImplementation(async (account) =>
      account === 'Main'
        ? [
          pd2('Main', 'LowPal', 40, true),
          pd2('Main', 'Hammer', 92, true),
          pd2('Main', 'OldHammer', 99, false),
          pd2('Main', 'HcPal', 80, true, true),
        ]
        : [pd2('Mules', 'MuleA', 1, true), pd2('Mules', 'MuleB', 1, false)],
    );
    const names = (await getSimLadderCharacters('tok', 'main')).map((c) => `${c.account}/${c.name}`);
    expect(names).toEqual(['Main/hammer', 'Main/hcpal', 'Main/lowpal', 'Mules/mulea']);
  });

  it("keeps every character of an account PD2 can't list, rather than none", async () => {
    vi.mocked(getAccountCharacters).mockImplementation(async (account) => {
      if (account === 'Main') throw new Error('PD2 answered 500');
      return null;
    });
    const characters = await getSimLadderCharacters('tok', 'Main');
    expect(characters.map((c) => c.name)).toEqual(['lowpal', 'hammer', 'oldhammer', 'hcpal', 'gone', 'mulea', 'muleb']);
    expect(characters[0].level).toBeUndefined();
  });
});

describe('preferredSimCharacter', () => {
  const list: SimCharacter[] = [
    { name: 'hammer', account: 'Main', level: 92 },
    { name: 'sorc', account: 'Main', level: 70 },
  ];

  it('keeps the last pick while it is listed, else the first listed', () => {
    expect(preferredSimCharacter(list, 'Sorc')).toBe('sorc');
    // A last pick that left the ladder (season reset) or was deleted
    expect(preferredSimCharacter(list, 'oldpal')).toBe('hammer');
    expect(preferredSimCharacter([], 'hammer')).toBe('');
  });
});
