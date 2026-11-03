// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotionSafe } from '../lib/motion';
import { PanelChrome, PanelSurface } from './panel-chrome';

vi.mock('../lib/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/motion')>()),
  useReducedMotionSafe: vi.fn(() => false),
}));

afterEach(cleanup);

const bar = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-slot="panel-chrome"]')!;

describe('PanelChrome', () => {
  it('is the panel drag handle with a grip by default', () => {
    const { container } = render(<PanelChrome title="Offers" />);
    expect(bar(container).hasAttribute('data-panel-drag')).toBe(true);
    expect(screen.getByText('Offers').closest('[data-panel-drag]')).toBe(bar(container));
    expect(bar(container).querySelector('svg[aria-hidden]')).not.toBeNull();
  });

  it('drops drag regions and the grip when dragRegion is false', () => {
    const { container } = render(<PanelChrome title="Static"
      dragRegion={false} />);
    expect(container.querySelector('[data-panel-drag]')).toBeNull();
    expect(bar(container).querySelector('svg')).toBeNull();
  });

  it('can hide the grip while keeping the drag region', () => {
    const { container } = render(<PanelChrome title="T"
      showGrip={false} />);
    expect(bar(container).hasAttribute('data-panel-drag')).toBe(true);
    expect(bar(container).querySelector('svg')).toBeNull();
  });

  it('renders a labelled close button only when onClose is provided', () => {
    const onClose = vi.fn();
    const { rerender } = render(<PanelChrome title="T" />);
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<PanelChrome title="T"
      onClose={onClose}
      closeLabel="Close chat" />);
    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('defaults the close label to Close and renders actions before it', () => {
    render(<PanelChrome title="T"
      onClose={vi.fn()}
      actions={<span>badge</span>} />);
    const close = screen.getByRole('button', { name: 'Close' });
    const badge = screen.getByText('badge');
    expect(badge.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('applies the Diablo font only when requested', () => {
    const { rerender } = render(<PanelChrome title="Title" />);
    expect(screen.getByText('Title').style.fontFamily).toBe('');
    rerender(<PanelChrome title="Title"
      diabloFont />);
    expect(screen.getByText('Title').style.fontFamily).toBe('DiabloFont');
  });
});

describe('PanelSurface', () => {
  it('renders a plain panel passing through DOM props', () => {
    render(
      <PanelSurface id="p"
        aria-label="panel">
        content
      </PanelSurface>,
    );
    const panel = screen.getByLabelText('panel');
    expect(panel.id).toBe('p');
    expect(panel.getAttribute('data-slot')).toBe('panel-surface');
    expect(panel.textContent).toBe('content');
  });

  it('animates in only when requested and motion is not reduced', () => {
    const { rerender } = render(
      <PanelSurface animate
        aria-label="panel">
        x
      </PanelSurface>,
    );
    // framer-motion sets the initial "hidden" variant as inline style
    expect(screen.getByLabelText('panel').getAttribute('style')).toContain('opacity');

    vi.mocked(useReducedMotionSafe).mockReturnValue(true);
    rerender(
      <PanelSurface animate
        aria-label="panel">
        x
      </PanelSurface>,
    );
    expect(screen.getByLabelText('panel').getAttribute('style')).toBeNull();
  });
});
