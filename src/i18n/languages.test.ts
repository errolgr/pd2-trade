import { describe, expect, it } from 'vitest';
import { detectSystemLanguage, matchSupportedLanguage, resolveLanguage, SUPPORTED_LANGUAGES } from './languages';

describe('matchSupportedLanguage', () => {
  it.each([
    ['en', 'en'],
    ['en-US', 'en'],
    ['en-GB', 'en'],
    ['de', 'de'],
    ['de-AT', 'de'],
    ['de-CH', 'de'],
    ['fr-CA', 'fr'],
    ['ru-RU', 'ru'],
    ['es-MX', 'es'],
    ['es-419', 'es'],
    ['pt', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['pt-BR', 'pt-BR'],
    ['pl-PL', 'pl'],
    ['zh', 'zh-CN'],
    ['zh-CN', 'zh-CN'],
    ['zh-TW', 'zh-CN'],
    ['zh-Hans-CN', 'zh-CN'],
    ['zh-Hant-HK', 'zh-CN'],
    ['DE-at', 'de'],
    ['de_DE.UTF-8', 'de'],
    ['ru_RU@euro', 'ru'],
  ])('%s → %s', (tag, expected) => {
    expect(matchSupportedLanguage(tag)).toBe(expected);
  });

  it.each(['ja-JP', 'it', 'C', 'POSIX', '', null, undefined])('%s is unsupported', (tag) => {
    expect(matchSupportedLanguage(tag)).toBeUndefined();
  });

  it('maps every supported language to itself', () => {
    for (const language of SUPPORTED_LANGUAGES) expect(matchSupportedLanguage(language)).toBe(language);
  });
});

describe('detectSystemLanguage', () => {
  it('takes the first supported preferred locale', () => {
    expect(detectSystemLanguage(['ja-JP', 'de-AT', 'en-US'])).toBe('de');
    expect(detectSystemLanguage(['en-US', 'de-DE'])).toBe('en');
  });

  it('falls back to English', () => {
    expect(detectSystemLanguage(['ja-JP', 'it-IT'])).toBe('en');
    expect(detectSystemLanguage([])).toBe('en');
  });
});

describe('resolveLanguage', () => {
  it('uses a fixed supported language as is', () => {
    expect(resolveLanguage('pl', ['de-DE'])).toBe('pl');
    expect(resolveLanguage('en', ['de-DE'])).toBe('en');
  });

  it('follows the system for system, unknown or missing settings', () => {
    expect(resolveLanguage('system', ['pt-PT'])).toBe('pt-BR');
    expect(resolveLanguage('klingon', ['ru-RU'])).toBe('ru');
    expect(resolveLanguage(undefined, ['zh-TW'])).toBe('zh-CN');
    expect(resolveLanguage(null, ['ja-JP'])).toBe('en');
  });
});
