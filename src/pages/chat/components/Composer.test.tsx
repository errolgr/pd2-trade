// @vitest-environment happy-dom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { ItemsProvider } from '@/hooks/useItems';
import { useOptions } from '@/hooks/useOptions';
import { findMarketLinks } from '../lib/market-links';
import { Composer, type ReplyChannel, type TemplateVars } from './Composer';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const VARS: TemplateVars = { accountName: 'AliceAcc', itemName: 'Shako', price: '2 HR' };

let settings: Record<string, unknown>;
let getMarketListings: Mock;
let onSend: Mock;

function Harness({ initial = '', switchable = false }: { initial?: string; switchable?: boolean }) {
  const [value, setValue] = useState(initial);
  const [channel, setChannel] = useState<ReplyChannel>('website');
  return (
    <ItemsProvider items={[]}>
      <Composer
        value={value}
        onChange={setValue}
        onSend={onSend}
        placeholder="Message Alice..."
        templateVars={VARS}
        channel={channel}
        onChannelChange={switchable ? setChannel : undefined}
      />
    </ItemsProvider>
  );
}

const textarea = () => screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
const options = () => screen.queryAllByRole('option').map((o) => o.textContent);

function type(value: string, caret = value.length) {
  fireEvent.change(textarea(), { target: { value } });
  textarea().setSelectionRange(caret, caret);
}

function listing(id: string, name: string, hr_price: number, base = name): MarketListingEntry {
  return {
    _id: id,
    hr_price,
    price: hr_price ? '' : 'offers',
    item: { name, quality: { id: 7, name: 'Unique' }, base: { name: base } },
  } as unknown as MarketListingEntry;
}

beforeEach(() => {
  settings = {
    mode: 'hardcore',
    ladder: 'ladder',
    acceptOfferMessageTemplate: 'Accepted {itemName} for {price}. Game: {gameInfo}',
    rejectOfferMessageTemplate: 'Sorry {accountName}, declined.',
    soldOfferMessageTemplate: 'The {itemName} is sold.',
  };
  onSend = vi.fn();
  getMarketListings = vi.fn(async () => ({
    total: 2,
    limit: 50,
    skip: 0,
    data: [listing('aa11', 'Harlequin Crest', 2.5, 'Shako'), listing('bb22', "Tal Rasha's Guardianship", 0)],
  }));
  vi.mocked(usePd2Website).mockImplementation(
    () => ({ authData: { user: { _id: 'me' } }, getMarketListings }) as unknown as ReturnType<typeof usePd2Website>,
  );
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as unknown as ReturnType<typeof useOptions>);
});

afterEach(cleanup);

describe('Composer sending', () => {
  it('sends the trimmed text on Enter and clears the draft', () => {
    render(<Harness />);
    type('  2 ist?  ');
    fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('2 ist?');
    expect(textarea().value).toBe('');
  });

  it('leaves Shift+Enter to insert a newline, and does not send blank text', () => {
    render(<Harness />);
    type('line one');
    // Not prevented: the textarea inserts the newline itself
    expect(fireEvent.keyDown(textarea(), { key: 'Enter', shiftKey: true })).toBe(true);
    type('   ');
    fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('ignores Enter while an IME composition is active', () => {
    render(<Harness />);
    type('にほん');
    expect(fireEvent.keyDown(textarea(), { key: 'Enter', isComposing: true })).toBe(true);
    expect(onSend).not.toHaveBeenCalled();
    expect(textarea().value).toBe('にほん');
  });

  it('sends with the Send button', () => {
    render(<Harness initial="ty gl" />);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledWith('ty gl');
  });

  it('offers the Website/Whisper switch only when both reach the person; Whisper sends as a copied whisper', () => {
    const { unmount } = render(<Harness initial="hi" />);
    expect(screen.queryByRole('group', { name: 'Reply via' })).toBeNull();
    unmount();

    render(<Harness initial="hi"
      switchable />);
    const via = screen.getByRole('group', { name: 'Reply via' });
    expect(
      within(via)
        .getByRole('radio', { name: /Website/ })
        .getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.click(within(via).getByRole('radio', { name: /Whisper/ }));
    expect(
      within(via)
        .getByRole('radio', { name: /Whisper/ })
        .getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Copy whisper' }));
    expect(onSend).toHaveBeenCalledWith('hi');
  });
});

describe('Composer templates', () => {
  it('opens on "/" with the labelled templates filled in, filters as you type and inserts on Enter', () => {
    render(<Harness />);
    type('/');
    expect(options()).toEqual([
      'Offer acceptedAccepted Shako for 2 HR. Game: ',
      'Offer declinedSorry AliceAcc, declined.',
      'Item soldThe Shako is sold.',
    ]);

    type('/sold');
    expect(options()).toEqual(['Item soldThe Shako is sold.']);
    fireEvent.keyDown(textarea(), { key: 'Enter' });

    expect(textarea().value).toBe('The Shako is sold.');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('moves the choice with the arrow keys and picks with Tab', () => {
    render(<Harness />);
    type('/');
    fireEvent.keyDown(textarea(), { key: 'ArrowDown' });
    fireEvent.keyDown(textarea(), { key: 'ArrowDown' });
    fireEvent.keyDown(textarea(), { key: 'ArrowDown' });
    fireEvent.keyDown(textarea(), { key: 'ArrowUp' });
    expect(screen.getByRole('option', { selected: true }).textContent).toContain('Item sold');
    fireEvent.keyDown(textarea(), { key: 'ArrowDown' });
    fireEvent.keyDown(textarea(), { key: 'Tab' });
    expect(textarea().value).toBe('Accepted Shako for 2 HR. Game: ');
  });

  it('closes on Escape, and only offers templates the user has set', () => {
    settings.rejectOfferMessageTemplate = '';
    render(<Harness />);
    type('/');
    expect(options()).toHaveLength(2);
    fireEvent.keyDown(textarea(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(textarea().value).toBe('/');

    type('/x');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('Composer quick replies', () => {
  it('inserts a chip at the caret without sending', () => {
    render(<Harness />);
    type('hi  pls', 3);
    fireEvent.click(screen.getByRole('button', { name: 'Inv me' }));
    expect(textarea().value).toBe('hi Inv me pls');
    expect(onSend).not.toHaveBeenCalled();
  });
});

describe('Composer listing picker', () => {
  async function openPicker() {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Link one of my listings' }));
    });
    await act(async () => {});
    return screen.getByRole('dialog');
  }

  it("lists the user's active listings in their realm with price, searchable by name", async () => {
    render(<Harness />);
    const picker = await openPicker();

    expect(getMarketListings).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'me', is_hardcore: true, is_ladder: true, $limit: 50, $skip: 0 }),
    );
    const items = () =>
      within(picker)
        .queryAllByRole('button')
        .map((b) => b.textContent);
    expect(items()).toEqual(['Harlequin CrestShako2.5 HR', "Tal Rasha's Guardianshipoffers"]);

    fireEvent.change(within(picker).getByPlaceholderText('Search my listings...'), { target: { value: 'tal' } });
    expect(items()).toEqual(["Tal Rasha's Guardianshipoffers"]);
  });

  it('inserts the listing link at the caret, as a link the chat recognises', async () => {
    render(<Harness />);
    type('want this? ok', 10);
    const picker = await openPicker();
    await act(async () => {
      fireEvent.click(within(picker).getByRole('button', { name: /Harlequin Crest/ }));
    });

    const url = 'https://www.projectdiablo2.com/market/listing/aa11?display="Harlequin Crest"';
    expect(textarea().value).toBe(`want this? ${url} ok`);
    expect(findMarketLinks(textarea().value)).toEqual([
      expect.objectContaining({ listingId: 'aa11', displayName: 'Harlequin Crest', url }),
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onSend).not.toHaveBeenCalled();
  });
});
