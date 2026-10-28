/**
 * UI localization (i18next). Imported by main.tsx before the first render; every module that translates imports
 * `useTranslation` / `Trans` / `t` from here (not from react-i18next directly) so the instance is always initialized.
 *
 * Conventions:
 * - One namespace per UI area: src/i18n/locales/<language>/<namespace>.json, English is the source.
 * - Keys nest by component / feature, camelCase leaves: t('market:filters.clearAll').
 * - Plurals use i18next suffixes with {{count}}: key_one / key_other (+ _few / _many where the language has them).
 * - Markup inside a sentence goes through <Trans> with named tags: "Press <kbd>{{key}}</kbd> to open".
 * - Never call t() at module scope (it would not follow language changes): keep option lists as keys.
 * - Game data stays English (item names, bases, stats, runes, market data): PD2 itself is English-only.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, type LanguageSetting, resolveLanguage, SUPPORTED_LANGUAGES } from './languages';
import { NAMESPACES, resources } from './resources';

export { Trans, useTranslation } from 'react-i18next';
export * from './languages';

/** Caches the language setting so the first paint (and the sign-in window) uses it before settings load. */
const LANGUAGE_STORAGE_KEY = 'pd2trader.language';

function readStoredLanguageSetting(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(readStoredLanguageSetting()),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  // 'pt-BR' / 'zh-CN' are the resource keys: never fall back through 'pt' / 'zh'.
  load: 'currentOnly',
  ns: NAMESPACES,
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React escapes
  returnNull: false,
  initAsync: false, // resources are bundled: translate synchronously from the first render
  react: { useSuspense: false },
});

if (typeof document !== 'undefined') document.documentElement.lang = i18n.language;

// The sign-in window shares localStorage with the overlay: follow a language picked while it is open.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== LANGUAGE_STORAGE_KEY) return;
    const language = resolveLanguage(event.newValue);
    document.documentElement.lang = language;
    if (i18n.language !== language) void i18n.changeLanguage(language);
  });
}

/** Applies the Settings → Interface language ('system' = follow the OS) and caches it for the next start. */
export function applyLanguage(setting: LanguageSetting | undefined): void {
  const value = setting ?? 'system';
  try {
    if (localStorage.getItem(LANGUAGE_STORAGE_KEY) !== value) localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  } catch {
    // localStorage unavailable: the next start detects the language again.
  }
  const language = resolveLanguage(value);
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  if (i18n.language !== language) void i18n.changeLanguage(language);
}

/** The active UI language as a BCP 47 tag, for Intl / toLocale*String date and number formatting. */
export function currentLocale(): string {
  return i18n.language || DEFAULT_LANGUAGE;
}

/** Translate outside React (toasts, .ts helpers). Call it when the text is shown, never at module scope. */
export const t = i18n.t.bind(i18n) as typeof i18n.t;

export default i18n;
