// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Review, Screenshot } from '../../marketplace/api';
import { ReviewForm } from './Reviews';
import { ScreenshotGallery, slideForKey } from './ScreenshotGallery';

vi.mock('@/overlay', () => ({ showToast: vi.fn(), confirmToast: vi.fn() }));
vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));

afterEach(cleanup);

const shot = (i: number): Screenshot => ({
  file: `${i}.png`,
  url: `https://cdn.test/${i}.png`,
  type: 'image/png',
  width: 1280,
  height: 720,
  caption: `Caption ${i}`,
});

describe('slideForKey', () => {
  it('wraps arrows, jumps with Home/End and ignores other keys or a single slide', () => {
    expect(slideForKey('ArrowRight', 2, 3)).toBe(0);
    expect(slideForKey('ArrowLeft', 0, 3)).toBe(2);
    expect(slideForKey('Home', 2, 3)).toBe(0);
    expect(slideForKey('End', 0, 3)).toBe(2);
    expect(slideForKey('a', 0, 3)).toBeNull();
    expect(slideForKey('ArrowRight', 0, 1)).toBeNull();
  });
});

describe('ScreenshotGallery', () => {
  it('moves between slides with the arrow keys and shows each caption', () => {
    render(<ScreenshotGallery screenshots={[shot(1), shot(2), shot(3)]}
      name="Ticker" />);
    const gallery = screen.getByRole('region');
    expect(gallery.getAttribute('data-keep-keyboard')).not.toBeNull();
    expect(screen.getByText('Caption 1')).toBeTruthy();
    fireEvent.keyDown(gallery, { key: 'ArrowRight' });
    expect(screen.getByText('Caption 2')).toBeTruthy();
    fireEvent.keyDown(gallery, { key: 'End' });
    expect(screen.getByText('Caption 3')).toBeTruthy();
    fireEvent.keyDown(gallery, { key: 'ArrowRight' });
    expect(screen.getByText('Caption 1')).toBeTruthy();
    fireEvent.keyDown(gallery, { key: 'ArrowLeft' });
    expect(screen.getByText('Caption 3')).toBeTruthy();
  });

  it('renders nothing without screenshots', () => {
    const { container } = render(<ScreenshotGallery screenshots={[]}
      name="Ticker" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('ReviewForm', () => {
  const existing: Review = {
    id: 'r1',
    author: 'bob',
    rating: 3,
    body: 'Was fine',
    version: '1.0.0',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    reply: null,
  };

  it('refuses to post without a star rating', async () => {
    const onSave = vi.fn(async () => {});
    render(<ReviewForm existing={null}
      installedVersion="1.1.0"
      onSave={onSave}
      onDelete={vi.fn()} />);
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('refuses a body over 2000 characters', async () => {
    const onSave = vi.fn(async () => {});
    render(<ReviewForm existing={existing}
      installedVersion="1.0.0"
      onSave={onSave}
      onDelete={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x'.repeat(2001) } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves against the installed version, moving an older review to it', async () => {
    const onSave = vi.fn(async () => {});
    render(<ReviewForm existing={existing}
      installedVersion="1.1.0"
      onSave={onSave}
      onDelete={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('radio')[4]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Much better now  ' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });
    expect(onSave).toHaveBeenCalledWith({ rating: 5, body: 'Much better now', version: '1.1.0' });
  });
});
