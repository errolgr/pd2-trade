import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, getTheme, SHAPE_TOKENS, THEME_TOKENS } from '../src/tokens';
import { renderTailwindCss, TAILWIND_CSS_PATH } from './build-css';

describe('generated tailwind.css', () => {
  it('is in sync with the token source (run `npm run build:css` if this fails)', () => {
    expect(readFileSync(TAILWIND_CSS_PATH, 'utf8')).toBe(renderTailwindCss());
  });

  it('ships the default theme in :root and maps every color token for Tailwind', () => {
    const css = renderTailwindCss();
    const theme = getTheme(DEFAULT_THEME_ID);
    for (const token of THEME_TOKENS) {
      expect(css).toContain(`--${token}: ${theme.vars[token]};`);
      if (!(SHAPE_TOKENS as readonly string[]).includes(token))
        expect(css).toContain(`--color-${token}: var(--${token});`);
    }
  });
});
