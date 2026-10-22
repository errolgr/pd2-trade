import { describe, expect, it } from 'vitest';
import type { Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { computePseudo, PSEUDO_STATS } from './pseudo';
import { mod } from './test-utils';

const pseudo = (...mods: Modifier[]) => computePseudo({ modifiers: mods });

describe('computePseudo', () => {
  it('returns every pseudo stat, all 0 for an item without mods', () => {
    const empty = computePseudo({ modifiers: [] });
    expect(Object.keys(empty).sort()).toEqual(PSEUDO_STATS.map((p) => p.id).sort());
    expect(Object.values(empty).every((v) => v === 0)).toBe(true);
    expect(computePseudo(null)).toEqual(empty);
  });

  it('adds all_resist into each resistance, the total and the lowest-of-four', () => {
    const p = pseudo(mod('fireresist', 30), mod('lightresist', 20), mod('all_resist', 10));
    expect(p).toMatchObject({
      pseudo_fire_res: 40,
      pseudo_cold_res: 10,
      pseudo_light_res: 30,
      pseudo_poison_res: 10,
      pseudo_total_res: 90,
      pseudo_all_res: 10,
    });
  });

  it('a single all_resist line counts four times in the total', () => {
    expect(pseudo(mod('all_resist', 15))).toMatchObject({ pseudo_total_res: 60, pseudo_all_res: 15 });
  });

  it('life and mana include vitality and energy (2 per point), attributes include all_attributes', () => {
    const p = pseudo(
      mod('maxhp', 40),
      mod('vitality', 10),
      mod('maxmana', 20),
      mod('energy', 5),
      mod('all_attributes', 2),
    );
    expect(p.pseudo_life).toBe(40 + 2 * 12);
    expect(p.pseudo_mana).toBe(20 + 2 * 7);
    expect(p.pseudo_vitality).toBe(12);
    expect(p.pseudo_strength).toBe(2);
    expect(p.pseudo_total_attributes).toBe(12 + 7 + 2 + 2);
  });

  it('skills: all skills plus the class skills roll (values[1]); best skill tab', () => {
    const p = pseudo(
      mod('item_allskills', 1),
      mod('item_addclassskills', 3, 2),
      mod('item_addskill_tab', 41, 3),
      mod('item_addskill_tab', 8, 1),
    );
    expect(p.pseudo_all_skills).toBe(3);
    expect(p.pseudo_skill_tab).toBe(3);
  });

  it('sums duplicate lines (a corruption can repeat a mod)', () => {
    expect(pseudo(mod('item_fastercastrate', 10), mod('item_fastercastrate', 10)).pseudo_fcr).toBe(20);
  });

  it('best element for skill damage and enemy resistance', () => {
    const p = pseudo(mod('passive_fire_mastery', 5), mod('passive_cold_mastery', 9), mod('passive_ltng_pierce', 7));
    expect(p.pseudo_skill_damage).toBe(9);
    expect(p.pseudo_enemy_res).toBe(7);
  });
});
