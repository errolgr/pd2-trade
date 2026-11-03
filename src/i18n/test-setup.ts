// Vitest setup: tests run against the English source strings whatever the machine's locale.
import i18n from '@/i18n';

void i18n.changeLanguage('en');
