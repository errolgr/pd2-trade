// @vitest-environment happy-dom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { ItemsProvider } from '@/hooks/useItems';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { createOptionsStore, type OptionsStore } from '@/components/dialogs/optionsv2/test-utils';
import type * as Overlay from '@/overlay';
import { findMarketLinks } from '../lib/market-links';
import { pasteText, placeCaret, typeAtCaret, typeDraft } from './composer-test-utils';
import { Composer, type ReplyChannel, type TemplateVars } from './Composer';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
const openPanel = vi.hoisted(() => vi.fn());
/** undoToast calls: title and the Undo callback of each toast shown. */
const undoToasts = vi.hoisted(() => [] as { title: string; description?: string; onUndo: () => void }[]);
vi.mock('@/overlay', async (importOriginal) => ({
  ...(await importOriginal<typeof Overlay>()),
  useOverlay: () => ({ openPanel }),
  undoToast: (options: { title: string; description?: string; onUndo: () => void }) => {
    undoToasts.push(options);
    return () => {};
  },
}));
// Market prices of attached listings (their hover popover): none known
vi.mock('@/pages/currency/lib/price-api', () => ({ fetchMultipleItemPrices: vi.fn(async () => new Map()) }));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const VARS: TemplateVars = { accountName: 'AliceAcc', itemName: 'Shako', price: '2 HR' };

let settings: Partial<ISettings>;
/** The settings store, created on first render from `settings` as the test left it. */
let store: OptionsStore | undefined;
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
  store = undefined;
  undoToasts.length = 0;
  onSend = vi.fn();
  openPanel.mockClear();
  getMarketListings = vi.fn(async () => ({
    total: 2,
    limit: 50,
    skip: 0,
    data: [listing('aa11', 'Harlequin Crest', 2.5, 'Shako'), listing('bb22', "Tal Rasha's Guardianship", 0)],
  }));
  vi.mocked(usePd2Website).mockImplementation(
    () => ({ authData: { user: { _id: 'me' } }, getMarketListings }) as unknown as ReturnType<typeof usePd2Website>,
  );
  vi.mocked(useOptions).mockImplementation(() => (store ??= createOptionsStore(settings)).useOptions());
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
  const NEW = 'New template';
  const MANAGE = 'Manage templates…';

  it('opens on "/" with the labelled templates filled in, filters as you type and inserts on Enter', () => {
    render(<Harness />);
    type('/');
    expect(options()).toEqual([
      'Offer acceptedAccepted Shako for 2 HR. Game: ',
      'Offer declinedSorry AliceAcc, declined.',
      'Item soldThe Shako is sold.',
      NEW,
      MANAGE,
    ]);

    type('/sold');
    expect(options()).toEqual(['Item soldThe Shako is sold.', NEW, MANAGE]);
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
    // Down past "Manage templates…" wraps to the top
    for (let i = 0; i < 3; i++) fireEvent.keyDown(editor(), { key: 'ArrowDown' });
    fireEvent.keyDown(editor(), { key: 'Tab' });
    expect(editor().textContent).toBe('Accepted Shako for 2 HR. Game: ');
  });

  it('closes on Escape, and only offers templates the user has set', () => {
    settings.rejectOfferMessageTemplate = '';
    render(<Harness />);
    type('/');
    expect(options()).toHaveLength(4);
    fireEvent.keyDown(editor(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(editor().textContent).toBe('/');

    type('/x');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it("lists the user's own templates first, filled from the thread, filtered by name or text", () => {
    settings.chatTemplates = [
      { id: 'a', name: 'Still available?', text: 'Hi, is your {itemName} still available?' },
      { id: 'b', name: 'Haggle', text: 'Would you take {price}, {accountName}?' },
      { id: 'c', name: 'Blank', text: '   ' },
    ];
    render(<Harness />);
    type('/');
    expect(options()).toEqual([
      'Still available?Hi, is your Shako still available?',
      'HaggleWould you take 2 HR, AliceAcc?',
      'Offer acceptedAccepted Shako for 2 HR. Game: ',
      'Offer declinedSorry AliceAcc, declined.',
      'Item soldThe Shako is sold.',
      NEW,
      MANAGE,
    ]);

    // By name
    type('/hag');
    expect(options()).toEqual(['HaggleWould you take 2 HR, AliceAcc?', NEW, MANAGE]);
    // By (filled) text
    type('/aliceacc');
    expect(options()).toEqual([
      'HaggleWould you take 2 HR, AliceAcc?',
      'Offer declinedSorry AliceAcc, declined.',
      NEW,
      MANAGE,
    ]);
    fireEvent.click(screen.getByRole('option', { name: /Haggle/ }));
    expect(editor().textContent).toBe('Would you take 2 HR, AliceAcc?');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('"Manage templates…" opens Settings on the Chat section and drops the "/"', () => {
    render(<Harness />);
    type('/');
    fireEvent.click(screen.getByRole('option', { name: MANAGE }));
    expect(openPanel).toHaveBeenCalledWith('settings', { section: 'Chat' });
    expect(editor().textContent).toBe('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('offers "New template" and "Manage templates…" on "/" even without any templates, also by keyboard', () => {
    settings = { mode: 'hardcore', ladder: 'ladder', chatTemplates: [] };
    render(<Harness />);
    type('/');
    expect(options()).toEqual([NEW, MANAGE]);
    expect(screen.queryByText('No templates yet')).not.toBeNull();
    fireEvent.keyDown(editor(), { key: 'ArrowUp' });
    fireEvent.keyDown(editor(), { key: 'Enter' });
    expect(openPanel).toHaveBeenCalledWith('settings', { section: 'Chat' });
    expect(onSend).not.toHaveBeenCalled();
  });
});

describe('Composer template management', () => {
  const HAGGLE = { id: 'b', name: 'Haggle', text: 'Would you take {price}, {accountName}?' };
  const MINE = [{ id: 'a', name: 'Still available?', text: 'Is your {itemName} still available?' }, HAGGLE];
  const savedTemplates = () => store!.updateSettings.mock.calls.at(-1)?.[0].chatTemplates;
  const form = (name: string) => screen.getByRole('form', { name });
  const nameInput = () => screen.getByLabelText('Name') as HTMLInputElement;
  const textInput = () => screen.getByLabelText('Message', { selector: 'textarea' }) as HTMLTextAreaElement;
  const ctrl = (key: string) => fireEvent.keyDown(editor(), { key, ctrlKey: true });

  beforeEach(() => {
    settings.chatTemplates = MINE;
  });

  it('creates a template from the menu: it is saved, listed and the message gets the keyboard back', () => {
    render(<Harness />);
    type('/');
    fireEvent.click(screen.getByRole('option', { name: 'New template' }));
    // The form replaces the list; the menu stays open
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(nameInput());

    fireEvent.change(nameInput(), { target: { value: 'Thanks' } });
    fireEvent.change(textInput(), { target: { value: 'ty {accountName}, gl' } });
    fireEvent.click(within(form('New template')).getByRole('button', { name: 'Add template' }));

    expect(savedTemplates()).toEqual([
      ...MINE,
      { id: expect.any(String), name: 'Thanks', text: 'ty {accountName}, gl' },
    ]);
    expect(options()).toContain('Thanksty AliceAcc, gl');
    expect(document.activeElement).toBe(editor());
    expect(editor().textContent).toBe('/');
  });

  it('validates the form like Settings does, and inserts token chips at the caret', () => {
    render(<Harness />);
    type('/');
    fireEvent.click(screen.getByRole('option', { name: 'New template' }));
    fireEvent.click(within(form('New template')).getByRole('button', { name: 'Add template' }));
    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual([
      'Give the template a name',
      'Write the message',
    ]);
    expect(store!.updateSettings).not.toHaveBeenCalled();

    fireEvent.change(textInput(), { target: { value: 'Hi  there' } });
    textInput().setSelectionRange(3, 3);
    fireEvent.click(within(form('New template')).getByRole('button', { name: '{accountName}' }));
    expect(textInput().value).toBe('Hi {accountName} there');
  });

  it('edits a template in the menu with its pencil; Ctrl+Enter saves', () => {
    render(<Harness />);
    type('/');
    fireEvent.click(screen.getByRole('button', { name: 'Edit Haggle' }));
    expect(nameInput().value).toBe('Haggle');
    expect(textInput().value).toBe('Would you take {price}, {accountName}?');
    fireEvent.change(textInput(), { target: { value: 'I can do {price}' } });
    fireEvent.keyDown(textInput(), { key: 'Enter', ctrlKey: true });

    expect(savedTemplates()).toEqual([MINE[0], { ...HAGGLE, text: 'I can do {price}' }]);
    expect(options()).toContain('HaggleI can do 2 HR');
    expect(document.activeElement).toBe(editor());
  });

  it('edits an offer template in place: only its text', () => {
    render(<Harness />);
    type('/declined');
    fireEvent.click(screen.getByRole('button', { name: 'Edit Offer declined' }));
    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(textInput().value).toBe('Sorry {accountName}, declined.');
    fireEvent.change(textInput(), { target: { value: 'No thanks {accountName}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(store!.updateSettings).toHaveBeenLastCalledWith({ rejectOfferMessageTemplate: 'No thanks {accountName}' });
    expect(options()).toContain('Offer declinedNo thanks AliceAcc');
  });

  it('deletes a template right away, and Undo puts it back where it was', () => {
    render(<Harness />);
    type('/');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Still available?' }));
    expect(savedTemplates()).toEqual([HAGGLE]);
    expect(options()).not.toContain('Still available?Is your Shako still available?');
    expect(screen.queryByRole('button', { name: 'Delete Offer declined' })).toBeNull();

    expect(undoToasts).toEqual([
      expect.objectContaining({ title: 'Template deleted', description: 'Your template "Still available?".' }),
    ]);
    act(() => undoToasts[0].onUndo());
    expect(savedTemplates()).toEqual(MINE);
    expect(options()[0]).toBe('Still available?Is your Shako still available?');
  });

  it('works from the keyboard: arrows choose, Ctrl+E edits, Esc goes back to the list, Ctrl+D deletes', () => {
    render(<Harness />);
    type('/');
    fireEvent.keyDown(editor(), { key: 'ArrowDown' });
    expect(screen.getByText(/Ctrl\+E edit · Ctrl\+D delete/)).toBeTruthy();

    ctrl('e');
    expect(nameInput().value).toBe('Haggle');
    // Esc leaves the form for the list (not the conversation), the message has the keyboard again
    const esc = fireEvent.keyDown(nameInput(), { key: 'Escape' });
    expect(esc).toBe(false);
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(document.activeElement).toBe(editor());
    expect(store!.updateSettings).not.toHaveBeenCalled();

    // Still filtering as you type after "/"
    type('/hag');
    expect(options()[0]).toBe('HaggleWould you take 2 HR, AliceAcc?');
    ctrl('d');
    expect(savedTemplates()).toEqual([MINE[0]]);

    // The offer templates have no delete
    type('/sold');
    ctrl('d');
    expect(store!.updateSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Ctrl\+E edit$/)).toBeTruthy();
  });

  it('saves the message being written as a template, links kept as their URLs', async () => {
    const url = 'https://www.projectdiablo2.com/market/listing/aa11?display="Harlequin Crest"';
    render(<Harness initial={`wts ${url} 2 HR`} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Message templates' }));
    // Not a "/" search: every template, plus saving the draft
    expect(options().slice(-3)).toEqual(['Save message as template', 'New template', 'Manage templates…']);
    fireEvent.click(screen.getByRole('option', { name: 'Save message as template' }));

    expect(textInput().value).toBe(`wts ${url} 2 HR`);
    fireEvent.change(nameInput(), { target: { value: 'WTS shako' } });
    // Enter in the name submits the form
    fireEvent.submit(form('Save message as template'));

    expect(savedTemplates()?.at(-1)).toEqual({ id: expect.any(String), name: 'WTS shako', text: `wts ${url} 2 HR` });
    // The draft is untouched
    fireEvent.keyDown(editor(), { key: 'Escape' });
    fireEvent.keyDown(editor(), { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith(`wts ${url} 2 HR`);
  });

  it('the Templates button inserts a template at the caret, and closes when typing goes on', () => {
    render(<Harness />);
    type('hi  pls', 3);
    fireEvent.click(screen.getByRole('button', { name: 'Message templates' }));
    fireEvent.click(screen.getByRole('option', { name: /Item sold/ }));
    expect(editor().textContent).toBe('hi The Shako is sold. pls');
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Message templates' }));
    expect(screen.getByRole('listbox')).toBeTruthy();
    typeAtCaret(editor(), 'x');
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

  it('sends a space between a link and text typed right against its pill', async () => {
    render(<Harness initial={`look${URL}hello`} />);
    await settle();
    sendNow();
    expect(onSend).toHaveBeenCalledWith(`look ${URL} hello`);
  });
});
