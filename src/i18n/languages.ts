/**
 * The overlay's UI languages and how an OS / browser locale maps onto them. Kept free of i18next so the
 * mapping is testable on its own.
 */

/** English is the source language; every other locale file mirrors its keys. */
export const SUPPORTED_LANGUAGES = ['en', 'de', 'fr', 'ru', 'es', 'pt-BR', 'pl', 'zh-CN'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** The Settings → Interface choice: follow the OS language, or a fixed one. */
export type LanguageSetting = 'system' | SupportedLanguage;

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/** Each language in its own name, for the language selector. */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  ru: 'Русский',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
  pl: 'Polski',
  'zh-CN': '简体中文',
};

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * The supported language for a BCP 47 / POSIX locale tag, by its primary language: de-AT → de, pt / pt-PT → pt-BR,
 * zh-TW / zh-Hans-CN → zh-CN, en_US.UTF-8 → en. Undefined for anything else.
 */
export function matchSupportedLanguage(tag: string | null | undefined): SupportedLanguage | undefined {
  if (!tag) return undefined;
  const primary = tag.trim().replace(/_/g, '-').split(/[-.@]/)[0].toLowerCase();
  if (primary === 'pt') return 'pt-BR';
  if (primary === 'zh') return 'zh-CN';
  return SUPPORTED_LANGUAGES.find((lng) => lng === primary);
}

/** The webview's preferred languages (WebView2 and WebKitGTK derive them from the OS language), most preferred first. */
function systemLocales(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

/** The first of the preferred locales the overlay supports, else English. */
export function detectSystemLanguage(locales: readonly string[] = systemLocales()): SupportedLanguage {
  for (const locale of locales) {
    const match = matchSupportedLanguage(locale);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

/** The language to show for a saved setting: a fixed supported language, else the system one. */
export function resolveLanguage(
  setting: string | null | undefined,
  locales: readonly string[] = systemLocales(),
): SupportedLanguage {
  return isSupportedLanguage(setting) ? setting : detectSystemLanguage(locales);
}
