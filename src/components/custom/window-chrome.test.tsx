// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotionSafe } from '@/lib/motion';
import { WindowChrome, WindowPanel } from './window-chrome';

vi.mock('@/lib/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/motion')>()),
  useReducedMotionSafe: vi.fn(() => false),
}));

afterEach(cleanup);

const bar = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-slot="window-chrome"]')!;

describe('WindowChrome', () => {
  it('is the panel drag handle with a grip by default', () => {
    const { container } = render(<WindowChrome title="Offers" />);
    expect(bar(container).hasAttribute('data-panel-drag')).toBe(true);
    expect(screen.getByText('Offers').closest('[data-panel-drag]')).toBe(bar(container));
    expect(bar(container).querySelector('svg[aria-hidden]')).not.toBeNull();
  });

  it('drops drag regions and the grip when dragRegion is false', () => {
    const { container } = render(<WindowChrome title="Static"
      dragRegion={false} />);
    expect(container.querySelector('[data-panel-drag]')).toBeNull();
    expect(bar(container).querySelector('svg')).toBeNull();
  });

  it('can hide the grip while keeping the drag region', () => {
    const { container } = render(<WindowChrome title="T"
      showGrip={false} />);
    expect(bar(container).hasAttribute('data-panel-drag')).toBe(true);
    expect(bar(container).querySelector('svg')).toBeNull();
  });

  it('renders a labelled close button only when onClose is provided', () => {
    const onClose = vi.fn();
    const { rerender } = render(<WindowChrome title="T" />);
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<WindowChrome title="T"
      onClose={onClose}
      closeLabel="Close chat" />);
    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('defaults the close label to Close and renders actions before it', () => {
    render(<WindowChrome title="T"
      onClose={vi.fn()}
      actions={<span>badge</span>} />);
    const close = screen.getByRole('button', { name: 'Close' });
    const badge = screen.getByText('badge');
    expect(badge.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('applies the Diablo font only when requested', () => {
    const { rerender } = render(<WindowChrome title="Title" />);
    expect(screen.getByText('Title').style.fontFamily).toBe('');
    rerender(<WindowChrome title="Title"
      diabloFont />);
    expect(screen.getByText('Title').style.fontFamily).toBe('DiabloFont');
  });
});

describe('WindowPanel', () => {
  it('renders a plain panel passing through DOM props', () => {
    render(
      <WindowPanel id="p"
        aria-label="panel">
        content
      </WindowPanel>,
    );
    const panel = screen.getByLabelText('panel');
    expect(panel.id).toBe('p');
    expect(panel.getAttribute('data-slot')).toBe('window-panel');
    expect(panel.textContent).toBe('content');
  });

  it('animates in only when requested and motion is not reduced', () => {
    const { rerender } = render(
      <WindowPanel animate
        aria-label="panel">
        x
      </WindowPanel>,
    );
    // framer-motion sets the initial "hidden" variant as inline style
    expect(screen.getByLabelText('panel').getAttribute('style')).toContain('opacity');

    vi.mocked(useReducedMotionSafe).mockReturnValue(true);
    rerender(
      <WindowPanel animate
        aria-label="panel">
        x
      </WindowPanel>,
    );
    expect(screen.getByLabelText('panel').getAttribute('style')).toBeNull();
  });
});
