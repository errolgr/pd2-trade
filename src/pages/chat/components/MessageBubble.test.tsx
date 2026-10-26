// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeText } from '@/lib/browser-clipboard';
import { showToast } from '@/overlay';
import type { TimelineEntry } from '../lib/inbox';
import { MessageBubble, type MessageRow } from './MessageBubble';

vi.mock('@/lib/browser-clipboard', () => ({ writeText: vi.fn(async () => {}) }));
vi.mock('@/overlay', () => ({ showToast: vi.fn(), confirmToast: vi.fn() }));

const LINK = 'https://projectdiablo2.com/market/listing/0123456789abcdef01234567';
const entry: TimelineEntry = {
  key: 'm1',
  source: 'website',
  own: false,
  content: `Harlequin Crest ${LINK} still for sale?`,
  createdAt: '2026-05-01T12:00:00Z',
  unread: false,
};
const row: MessageRow = { entry, key: 'm1', startsDay: false, continuesGroup: false, groupContinues: false };

const renderBubble = () =>
  render(<MessageBubble row={row}
    otherName="Alice"
    onOpenTrader={() => {}}
    listings={new Map()}
    onRetry={() => {}} />);

beforeEach(() => {
  vi.mocked(writeText).mockReset().mockResolvedValue(undefined);
  vi.mocked(showToast).mockClear();
});

afterEach(cleanup);

describe('MessageBubble Copy', () => {
  it('copies the message as written, listing links as their URLs, and confirms', async () => {
    renderBubble();
    fireEvent.click(screen.getByRole('button', { name: 'Copy message' }));
    expect(writeText).toHaveBeenCalledWith(`Harlequin Crest ${LINK} still for sale?`);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith({ title: 'Copied' }));
  });

  it('shows the error toast when the clipboard write fails', async () => {
    vi.mocked(writeText).mockRejectedValue(new Error('denied'));
    renderBubble();
    fireEvent.click(screen.getByRole('button', { name: 'Copy message' }));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Message not copied', variant: 'error' }),
      ),
    );
    expect(showToast).toHaveBeenCalledTimes(1);
  });
});
