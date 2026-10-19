// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentWebviewWindow as tauriGetCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWebviewWindow } from './browser-webview';

const tauri = vi.hoisted(() => ({ value: false }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ getCurrentWebviewWindow: vi.fn() }));

function fakeTauriWindow() {
  return {
    label: 'QuickList',
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn().mockResolvedValue(undefined),
    onCloseRequested: vi.fn(),
    onFocusChanged: vi.fn(),
    setFocus: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  tauri.value = false;
});

describe('Tauri mode', () => {
  beforeEach(() => {
    tauri.value = true;
  });

  it('resolves the native window once and reuses it for every call', async () => {
    const native = fakeTauriWindow();
    vi.mocked(tauriGetCurrentWebviewWindow).mockReturnValue(native as never);
    const w = getCurrentWebviewWindow();

    await Promise.all([w.show(), w.hide()]);
    await w.setFocus();
    await w.emit('evt', { a: 1 });
    await w.close();

    expect(tauriGetCurrentWebviewWindow).toHaveBeenCalledTimes(1);
    expect(native.show).toHaveBeenCalledTimes(1);
    expect(native.hide).toHaveBeenCalledTimes(1);
    expect(native.setFocus).toHaveBeenCalledTimes(1);
    expect(native.emit).toHaveBeenCalledWith('evt', { a: 1 });
    expect(native.close).toHaveBeenCalledTimes(1);
  });

  it('registers close/focus callbacks on the native window once it resolves', async () => {
    const native = fakeTauriWindow();
    vi.mocked(tauriGetCurrentWebviewWindow).mockReturnValue(native as never);
    const w = getCurrentWebviewWindow();
    const onClose = vi.fn();
    const onFocus = vi.fn();

    w.onCloseRequested(onClose);
    w.onFocusChanged(onFocus);
    await w.show();

    expect(native.onCloseRequested).toHaveBeenCalledWith(onClose);
    expect(native.onFocusChanged).toHaveBeenCalledWith(onFocus);
  });

  it('resolves operations as no-ops when no native window is available', async () => {
    vi.mocked(tauriGetCurrentWebviewWindow).mockReturnValue(null as never);
    const w = getCurrentWebviewWindow();

    await expect(w.show()).resolves.toBeUndefined();
    await expect(w.emit('evt')).resolves.toBeUndefined();
    w.onCloseRequested(vi.fn());
  });
});

describe('browser mode', () => {
  it('emits as a window CustomEvent carrying the payload', async () => {
    const received = vi.fn();
    window.addEventListener('price-ready', (e) => received((e as CustomEvent).detail));

    await getCurrentWebviewWindow().emit('price-ready', { hr: 1.5 });

    expect(received).toHaveBeenCalledWith({ hr: 1.5 });
    expect(tauriGetCurrentWebviewWindow).not.toHaveBeenCalled();
  });

  it('maps show/setFocus to window.focus and hide to window.blur', async () => {
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => {});
    const blur = vi.spyOn(window, 'blur').mockImplementation(() => {});
    const w = getCurrentWebviewWindow();

    await w.show();
    await w.setFocus();
    await w.hide();

    expect(focus).toHaveBeenCalledTimes(2);
    expect(blur).toHaveBeenCalledTimes(1);
  });

  it('refuses to close the main browser window', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const close = vi.spyOn(window, 'close').mockImplementation(() => {});

    await getCurrentWebviewWindow().close();

    expect(close).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});
