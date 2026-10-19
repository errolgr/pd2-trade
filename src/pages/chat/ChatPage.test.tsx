// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChatPage from './ChatPage';

const close = vi.hoisted(() => vi.fn());
vi.mock('@/overlay', () => ({ usePanel: () => ({ close }) }));
vi.mock('@/pages/chat/components/ChatOverlayWidget', () => ({
  default: ({ onClose }: { onClose: () => void }) => <button onClick={onClose}>close widget</button>,
}));

afterEach(cleanup);

describe('ChatPage', () => {
  it('closes the chat panel when the widget closes', () => {
    render(<ChatPage />);
    fireEvent.click(screen.getByText('close widget'));
    expect(close).toHaveBeenCalledTimes(1);
  });
});
