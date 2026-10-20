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
import { pasteText, placeCaret, typeAtCaret, typeDraft } from './composer-test-utils';
import { Composer, type ReplyChannel, type TemplateVars } from './Composer';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
// Market prices of attached listings (their hover popover): none known
vi.mock('@/pages/currency/lib/price-api', () => ({ fetchMultipleItemPrices: vi.fn(async () => new Map()) }));

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

const editor = () => screen.getByRole('textbox', { name: 'Message' });
const options = () => screen.queryAllByRole('option').map((o) => o.textContent);

function type(value: string, caret = value.length) {
  typeDraft(editor(), value, caret);
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
    fireEvent.keyDown(editor(), { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('2 ist?');
    expect(editor().textContent).toBe('');
  });

  it('puts a newline in on Shift+Enter, and does not send blank text', () => {
    render(<Harness />);
    type('line one');
    fireEvent.keyDown(editor(), { key: 'Enter', shiftKey: true });
    typeAtCaret(editor(), 'two');
    fireEvent.keyDown(editor(), { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('line one\ntwo');
    onSend.mockClear();

    type('   ');
    fireEvent.keyDown(editor(), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('ignores Enter while an IME composition is active', () => {
    render(<Harness />);
    type('にほん');
    expect(fireEvent.keyDown(editor(), { key: 'Enter', isComposing: true })).toBe(true);
    expect(onSend).not.toHaveBeenCalled();
    expect(editor().textContent).toBe('にほん');
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
    fireEvent.keyDown(editor(), { key: 'Enter' });

    expect(editor().textContent).toBe('The Shako is sold.');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('moves the choice with the arrow keys and picks with Tab', () => {
    render(<Harness />);
    type('/');
    fireEvent.keyDown(editor(), { key: 'ArrowDown' });
    fireEvent.keyDown(editor(), { key: 'ArrowDown' });
    fireEvent.keyDown(editor(), { key: 'ArrowDown' });
    fireEvent.keyDown(editor(), { key: 'ArrowUp' });
    expect(screen.getByRole('option', { selected: true }).textContent).toContain('Item sold');
    fireEvent.keyDown(editor(), { key: 'ArrowDown' });
    fireEvent.keyDown(editor(), { key: 'Tab' });
    expect(editor().textContent).toBe('Accepted Shako for 2 HR. Game: ');
  });

  it('closes on Escape, and only offers templates the user has set', () => {
    settings.rejectOfferMessageTemplate = '';
    render(<Harness />);
    type('/');
    expect(options()).toHaveLength(2);
    fireEvent.keyDown(editor(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(editor().textContent).toBe('/');

    type('/x');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('Composer quick replies', () => {
  it('inserts a chip at the caret without sending', () => {
    render(<Harness />);
    type('hi  pls', 3);
    fireEvent.click(screen.getByRole('button', { name: 'Inv me' }));
    expect(editor().textContent).toBe('hi Inv me pls');
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

  const URL = 'https://www.projectdiablo2.com/market/listing/aa11?display="Harlequin Crest"';
  /** The pill of a listing inside the editor. */
  const pill = (name: string) => within(editor()).queryByText(name);
  /** Lets the linked listings' lookup settle. */
  const settle = () => act(async () => {});
  const sendNow = () => fireEvent.keyDown(editor(), { key: 'Enter' });

  it('links a picked listing inline at the caret, as a pill, sending its link in that place', async () => {
    render(<Harness />);
    type('want this? ok', 10);
    const picker = await openPicker();
    await act(async () => {
      fireEvent.click(within(picker).getByRole('button', { name: /Harlequin Crest/ }));
    });
    await settle();

    expect(pill('Harlequin Crest')).not.toBeNull();
    expect(editor().textContent).toBe('want this? Harlequin Crest ok');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onSend).not.toHaveBeenCalled();

    sendNow();
    expect(onSend).toHaveBeenCalledWith(`want this? ${URL} ok`);
    expect(findMarketLinks(onSend.mock.calls[0][0])).toEqual([
      expect.objectContaining({ listingId: 'aa11', displayName: 'Harlequin Crest', url: URL }),
    ]);
    expect(editor().textContent).toBe('');
  });

  it('removes a whole link with Backspace after its pill, or with its ×', async () => {
    const { unmount } = render(<Harness initial={`hi ${URL}`} />);
    await settle();
    expect(editor().textContent).toBe('hi Harlequin Crest');
    editor().focus();
    placeCaret(editor(), editor().childNodes.length);
    fireEvent.keyDown(editor(), { key: 'Backspace' });
    expect(pill('Harlequin Crest')).toBeNull();
    sendNow();
    expect(onSend).toHaveBeenLastCalledWith('hi');
    unmount();

    render(<Harness initial={`hi ${URL} there`} />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Harlequin Crest' }));
    expect(pill('Harlequin Crest')).toBeNull();
    sendNow();
    expect(onSend).toHaveBeenLastCalledWith('hi  there');
  });

  it('turns a listing link pasted mid-text into an inline pill', async () => {
    render(<Harness />);
    type('look here', 5);
    pasteText(editor(), `${URL} `);
    await settle();
    expect(editor().textContent).toBe('look Harlequin Crest here');
    expect(editor().textContent).not.toContain('https');
    sendNow();
    expect(onSend).toHaveBeenCalledWith(`look ${URL} here`);
  });

  it('keeps pills in place while typing around them', async () => {
    render(<Harness initial={URL} />);
    await settle();
    editor().focus();
    placeCaret(editor(), editor().childNodes.length);
    typeAtCaret(editor(), ' for 2 ist');
    placeCaret(editor(), 0);
    typeAtCaret(editor(), 'wts ');
    expect(editor().textContent).toBe('wts Harlequin Crest for 2 ist');
    sendNow();
    expect(onSend).toHaveBeenCalledWith(`wts ${URL} for 2 ist`);
  });
});
