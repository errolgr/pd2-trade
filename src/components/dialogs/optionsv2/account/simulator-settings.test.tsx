// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import { useSimLadderCharacters } from '@/hooks/useSimLadderCharacters';
import { SimulatorSettings } from './simulator-settings';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useSimLadderCharacters', () => ({ useSimLadderCharacters: vi.fn() }));

afterEach(cleanup);

describe('SimulatorSettings', () => {
  it('renders the saved character and goal outside any settings form', () => {
    vi.mocked(useOptions).mockReturnValue({
      settings: { pd2Token: 'tok', account: 'Acc', simCharacter: 'FrozenDez', simGoal: 'upgrade_finder' },
      updateSettings: vi.fn(),
    } as never);
    vi.mocked(useSimLadderCharacters).mockReturnValue({
      status: 'ok',
      data: [
        { name: 'HammerPal', account: 'Acc', className: 'Paladin', level: 92 },
        { name: 'FrozenDez', account: 'Acc', className: 'Sorceress', level: 90 },
      ],
    });
    render(<SimulatorSettings />);
    expect(screen.getByRole('combobox', { name: 'Character' }).textContent).toContain('FrozenDez');
    expect(screen.getByRole('combobox', { name: 'Default simulator goal' }).textContent).toContain('Upgrade Finder');
  });
});
