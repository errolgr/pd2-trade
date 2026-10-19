// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listen } from '@/lib/browser-events';
import ChatWindow from './ChatPage';

const hide = vi.fn();
vi.mock('@/lib/browser-events', () => ({ listen: vi.fn() }));
vi.mock('@/lib/browser-webview', () => ({ getCurrentWebviewWindow: () => ({ hide }) }));
vi.mock('@/hooks/useOptions', () => ({ OptionsProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  ChildPd2WebsiteProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/pages/chat/components/ChatOverlayWidget', () => ({
  default: ({ onClose }: { onClose: () => void }) => <button onClick={onClose}>close widget</button>,
}));

let unlistened: string[];

beforeEach(() => {
  unlistened = [];
  vi.mocked(listen).mockImplementation(async (event: string) => () => unlistened.push(event));
});

afterEach(cleanup);

describe('ChatPage', () => {
  it('hides the chat window when the widget closes', () => {
    render(<ChatWindow />);
    fireEvent.click(screen.getByText('close widget'));
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes from chat updates on unmount', async () => {
    const view = render(<ChatWindow />);
    view.unmount();
    await act(async () => {});
    expect(unlistened).toEqual(['chat-update']);
  });
});
