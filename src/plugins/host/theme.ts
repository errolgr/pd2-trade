import { atWindowOpacity, THEME_TOKENS, type Theme } from '@pd2-trader/ui/tokens';
import type { ThemeInfo } from '@pd2-trader/plugin-sdk';
import type { PluginThemeInfo } from './manager';

/** Extra vars plugin panels need beyond THEME_TOKENS: window transparency layers and the font. */
const EXTRA_VARS = ['window-opacity', 'window-opacity-elevated', 'font-family'] as const;

/** The theme currently applied to <html> (applyTheme writes every token inline there). */
export function currentThemeInfo(root: HTMLElement = document.documentElement): ThemeInfo {
  const computed = getComputedStyle(root);
  const vars: Record<string, string> = {};
  for (const token of [...THEME_TOKENS, ...EXTRA_VARS]) {
    const value = (root.style.getPropertyValue(`--${token}`) || computed.getPropertyValue(`--${token}`)).trim();
    if (value) vars[token] = value;
  }
  return {
    id: root.dataset.theme ?? 'default',
    mode: root.classList.contains('light') ? 'light' : 'dark',
    vars,
  };
}

/** Calls `onChange` with the new theme whenever the applied theme or window transparency changes. */
export function watchTheme(onChange: (theme: ThemeInfo) => void, root: HTMLElement = document.documentElement): () => void {
  let last = JSON.stringify(currentThemeInfo(root));
  let frame = 0;
  const observer = new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const theme = currentThemeInfo(root);
      const json = JSON.stringify(theme);
      if (json === last) return;
      last = json;
      onChange(theme);
    });
  });
  observer.observe(root, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] });
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
  };
}

/** A theme plugin's token set as an app theme; surfaces follow the window-transparency setting. */
export function pluginThemeToTheme(info: PluginThemeInfo): Theme {
  return {
    id: info.id,
    name: info.name,
    mode: info.mode,
    description: info.description,
    swatch: [info.vars.background, info.vars.primary, info.vars.glow],
    vars: {
      ...(info.vars as Theme['vars']),
      surface: atWindowOpacity(info.vars.background),
      'surface-elevated': atWindowOpacity(info.vars.popover, 'elevated'),
    },
  };
}
