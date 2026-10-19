import { describe, expect, it } from 'vitest';
import type { RareAppraisal, RareSlot } from '@/lib/rare-appraisal-api';
import { rareArtUrl } from './rare-art';

function art(slot: RareSlot, baseName: string, id = 'id-1'): string {
  const url = rareArtUrl({ id, slot, baseName } as RareAppraisal);
  return /\/assets\/items\/(\w+)\.png$/.exec(url)![1];
}

describe('rareArtUrl', () => {
  it('points at pd2trader item art', () => {
    expect(rareArtUrl({ id: 'x', slot: 'ring', baseName: 'Ring' } as RareAppraisal)).toBe(
      'https://pd2trader.com/assets/items/invrin.png',
    );
  });

  it('gives exceptional and elite bases the normal base art', () => {
    expect(art('helm', 'Cap')).toBe('invcap');
    expect(art('helm', 'War Hat')).toBe('invcap');
    expect(art('helm', 'Shako')).toBe('invcap');
    expect(art('weapon', 'Phase Blade')).toBe('invcrs');
    expect(art('weapon', "Hunter's Bow")).toBe('invhbw');
    expect(art('circ', 'Coronet')).toBe('invci0');
    expect(art('circ', 'Diadem')).toBe('invci3');
  });

  it('matches base names case-insensitively', () => {
    expect(art('belt', 'war belt')).toBe('invhbl');
    expect(art('tors', 'ARCHON PLATE')).toBe('invltp');
  });

  it('falls back to slot art for unknown bases, then to the ring', () => {
    expect(art('boot', 'Mystery Boots')).toBe('invlbt');
    expect(art('amul', 'Amulet')).toBe('invamu');
    expect(art('weapon', 'Unknown Thing')).toBe('invlsd');
    expect(art('nope' as RareSlot, 'Unknown Thing')).toBe('invrin');
  });

  it('distinguishes bolts from arrows for quivers', () => {
    expect(art('quiver', 'Bolts')).toBe('invcqv');
    expect(art('quiver', 'Crossbow BOLTS')).toBe('invcqv');
    expect(art('quiver', 'Arrows')).toBe('invqvr');
  });

  it('picks a stable jewel colour per item id, ignoring the base name', () => {
    const colours = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const a = art('jewl', 'Jewel', `jewel-${i}`);
      expect(a).toMatch(/^invgswe[1-6]$/);
      expect(art('jewl', 'Other', `jewel-${i}`)).toBe(a);
      colours.add(a);
    }
    expect(colours.size).toBe(6);
  });

  it('hashes long ids without overflowing into invalid colours', () => {
    expect(art('jewl', 'Jewel', 'z'.repeat(5000))).toMatch(/^invgswe[1-6]$/);
  });
});
