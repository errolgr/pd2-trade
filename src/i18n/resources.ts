import type { Resource, ResourceLanguage } from 'i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';
import app from './locales/en/app.json';
import builds from './locales/en/builds.json';
import chat from './locales/en/chat.json';
import common from './locales/en/common.json';
import currency from './locales/en/currency.json';
import market from './locales/en/market.json';
import netWorth from './locales/en/netWorth.json';
import priceCheck from './locales/en/priceCheck.json';
import quickList from './locales/en/quickList.json';
import rares from './locales/en/rares.json';
import settings from './locales/en/settings.json';
import system from './locales/en/system.json';

/**
 * The English source strings, one namespace per UI area (src/i18n/locales/en/<namespace>.json). A new namespace
 * needs a file per language and an entry here. (Keys are not typed: i18next's key types need strictNullChecks, which
 * this project doesn't enable; src/i18n/locales.test.ts checks the keys used in the source exist instead.)
 */
export const enResources = {
  common,
  app,
  system,
  settings,
  market,
  chat,
  quickList,
  priceCheck,
  currency,
  netWorth,
  rares,
  builds,
} as const;

export type Namespace = keyof typeof enResources;

export const NAMESPACES = Object.keys(enResources) as Namespace[];

/** Every locale file, bundled (no network): './locales/<language>/<namespace>.json'. */
const localeFiles = import.meta.glob<ResourceLanguage>('./locales/*/*.json', { eager: true, import: 'default' });

export function localePath(language: string, namespace: string): string {
  return `./locales/${language}/${namespace}.json`;
}

export const resources: Resource = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => [
    language,
    language === DEFAULT_LANGUAGE
      ? enResources
      : Object.fromEntries(
          NAMESPACES.map((namespace) => [namespace, localeFiles[localePath(language, namespace)] ?? {}]),
        ),
  ]),
);
