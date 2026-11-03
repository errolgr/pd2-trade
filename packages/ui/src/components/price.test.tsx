// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { UiLabelsProvider } from '../lib/labels';
import { CurrencyAmount, PriceTag, formatAmount, formatHrAmount } from './price';

afterEach(cleanup);

describe('formatHrAmount', () => {
  it('scales precision with size', () => {
    expect(formatHrAmount(0.04)).toBe('0.04');
    expect(formatHrAmount(1.3)).toBe('1.30');
    expect(formatHrAmount(27.54)).toBe('27.5');
    expect(formatHrAmount(340.4)).toBe('340');
    expect(formatHrAmount(1234)).toBe('1.2k');
  });

  it('keeps sub-cent amounts readable', () => {
    expect(formatHrAmount(0.0042)).toBe('0.0042');
    expect(formatHrAmount(0.005)).toBe('0.005');
    expect(formatHrAmount(0)).toBe('0.00');
  });
});

describe('formatAmount', () => {
  it('groups gold and trims rune counts', () => {
    expect(formatAmount(2_500_000, 'gold', 'en-US')).toBe('2,500,000');
    expect(formatAmount(1.5, 'rune', 'en-US')).toBe('1.5');
    expect(formatAmount(2, 'rune', 'en-US')).toBe('2');
    expect(formatAmount(Number.NaN, 'hr')).toBe('—');
  });
});

describe('PriceTag', () => {
  it('renders the unit per kind', () => {
    render(
      <>
        <PriceTag amount={1.3}
          unit="hr" />
        <PriceTag amount={2}
          unit="rune"
          rune="Ber Rune" />
      </>,
    );
    expect(screen.getByText('1.30 HR')).toBeTruthy();
    expect(screen.getByText('2 Ber')).toBeTruthy();
  });

  it('formats gold through the app labels', () => {
    render(
      <UiLabelsProvider labels={{ locale: 'de-DE', gold: (n) => `${n} Gold` }}>
        <PriceTag amount={2500}
          unit="gold" />
      </UiLabelsProvider>,
    );
    expect(screen.getByText('2.500 Gold')).toBeTruthy();
  });

  it('marks the trend', () => {
    const { container } = render(<PriceTag amount={1}
      unit="hr"
      trend="down" />);
    expect(container.querySelector('[data-trend="down"]')?.getAttribute('class')).toContain('text-destructive');
  });
});

describe('CurrencyAmount', () => {
  it('signs the delta', () => {
    const { container } = render(<CurrencyAmount amount={10}
      unit="hr"
      delta={-0.4} />);
    expect(container.querySelector('[data-slot="currency-delta"]')?.textContent).toBe('−0.40 HR');
  });
});
