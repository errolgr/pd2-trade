// Vitest setup: tests run against the English source strings whatever the machine's locale.
import i18n from '@/i18n';

void i18n.changeLanguage('en');

// Vitest runs without `globals`, so React Testing Library never registers the beforeAll that
// opts React into act() mode; opt in here so act() warnings are reported accurately.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
