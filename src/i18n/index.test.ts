// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n, { applyLanguage, currentLocale, t } from '@/i18n';

afterEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('en');
});

describe('applyLanguage', () => {
  it('switches to a fixed language, sets <html lang> and caches the setting', () => {
    applyLanguage('de');
    expect(i18n.language).toBe('de');
    expect(currentLocale()).toBe('de');
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem('pd2trader.language')).toBe('de');
    expect(t('common:actions.cancel')).not.toBe('Cancel');
  });

  it('follows the system language for System default', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['pt-PT', 'en-US']);
    applyLanguage('system');
    expect(i18n.language).toBe('pt-BR');
    expect(localStorage.getItem('pd2trader.language')).toBe('system');
  });

  it('treats a missing setting as System default', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ja-JP']);
    applyLanguage(undefined);
    expect(i18n.language).toBe('en');
    expect(t('common:actions.cancel')).toBe('Cancel');
  });
});
