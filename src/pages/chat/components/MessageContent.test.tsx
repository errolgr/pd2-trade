// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openUrl } from '@/lib/browser-opener';
import { ItemsProvider } from '@/hooks/useItems';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { ChatListingState } from '../hooks/useChatListings';
import { MessageContent } from './MessageContent';

vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));

const LISTING = 'https://www.projectdiablo2.com/market/listing/0123456789abcdef';

afterEach(cleanup);

/** Rendered segments in order: plain text spans as strings, links as { text, href }. */
function segments(content: string) {
  const { container } = render(<MessageContent content={content} />);
  const root = container.firstElementChild!;
  return Array.from(root.children).map((el) =>
    el.tagName === 'A' ? { text: el.textContent, href: el.getAttribute('href') } : el.textContent,
  );
}

describe('MessageContent', () => {
  it('renders plain text unchanged as a single segment', () => {
    expect(segments('wtb shako, pm me')).toEqual(['wtb shako, pm me']);
  });

  it('renders an empty message without crashing and without links', () => {
    expect(segments('')).toEqual(['']);
  });

  it('turns a bare listing URL into a link labelled with a truncated listing id', () => {
    expect(segments(`check ${LISTING} thanks`)).toEqual([
      'check ',
      { text: 'Market Listing 01234567...', href: LISTING },
      ' thanks',
    ]);
  });

  it('uses the quoted display name as the link label and strips the quotes', () => {
    const url = `${LISTING}?display="Harlequin Crest"`;
    expect(segments(`selling ${url}`)).toEqual(['selling ', { text: 'Harlequin Crest', href: url }]);
  });

  it('URI-decodes an unquoted display name', () => {
    const url = `${LISTING}?display=Harlequin%20Crest`;
    expect(segments(url)).toEqual([{ text: 'Harlequin Crest', href: url }]);
  });

  it('matches the host case-insensitively and accepts http', () => {
    const url = 'http://WWW.ProjectDiablo2.com/market/listing/ABCDEF12';
    expect(segments(url)).toEqual([{ text: 'Market Listing ABCDEF12...', href: url }]);
  });

  it("links the site's own interest message, which uses the bare projectdiablo2.com host", () => {
    const url = 'https://projectdiablo2.com/market/listing/6a0bf54e6c42aba37528aeb6?display="Ohm Rune"';
    expect(segments(`Hi, I'm interested in your ${url}`)).toEqual([
      "Hi, I'm interested in your ",
      { text: 'Ohm Rune', href: url },
    ]);
  });

  it('ignores listing URLs on other hosts and non-hex ids', () => {
    expect(segments('https://evil.example.com/market/listing/abc')).toEqual([
      'https://evil.example.com/market/listing/abc',
    ]);
    expect(segments('https://www.projectdiablo2.com/market/listing/zzz')).toEqual([
      'https://www.projectdiablo2.com/market/listing/zzz',
    ]);
  });

  it('replaces an earlier mention of the display name with the link and drops the raw URL', () => {
    const url = `${LISTING}?display=Shako`;
    expect(segments(`I want your Shako for 2 ist ${url}`)).toEqual([
      'I want your ',
      { text: 'Shako', href: url },
      ' for 2 ist ',
    ]);
  });

  it('drops whitespace-only text between the replaced display name and the URL', () => {
    const url = `${LISTING}?display=Shako`;
    expect(segments(`Shako   ${url}`)).toEqual([{ text: 'Shako', href: url }]);
  });

  it('links the last mention when the display name appears more than once before the URL', () => {
    const url = `${LISTING}?display=Shako`;
    expect(segments(`Shako or Shako ${url}`)).toEqual(['Shako or ', { text: 'Shako', href: url }]);
  });

  it('linkifies multiple URLs independently, keeping text between them', () => {
    const second = 'https://www.projectdiablo2.com/market/listing/fedcba98';
    expect(segments(`a ${LISTING} and ${second}`)).toEqual([
      'a ',
      { text: 'Market Listing 01234567...', href: LISTING },
      ' and ',
      { text: 'Market Listing fedcba98...', href: second },
    ]);
  });

  it('only searches for the display name after the previous link', () => {
    const first = `${LISTING}?display=Shako`;
    const second = 'https://www.projectdiablo2.com/market/listing/fedcba98?display=Shako';
    // The second URL's display name must not re-link text consumed by the first link.
    expect(segments(`${first} ${second}`)).toEqual([
      { text: 'Shako', href: first },
      ' ',
      { text: 'Shako', href: second },
    ]);
  });

  it('opens links externally without navigating the webview or triggering parent click handlers', () => {
    const url = `${LISTING}?display=Shako`;
    const parentClick = vi.fn();
    const { getByText } = render(
      <div onClick={parentClick}>
        <MessageContent content={url} />
      </div>,
    );
    const link = getByText('Shako').closest('a')!;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(link, click);

    expect(click.defaultPrevented).toBe(true);
    expect(parentClick).not.toHaveBeenCalled();
    expect(vi.mocked(openUrl)).toHaveBeenCalledWith(url);
  });

  it('keeps a display name with a malformed percent escape as typed instead of crashing', () => {
    const url = `${LISTING}?display=100%`;
    expect(segments(url)).toEqual([{ text: '100%', href: url }]);
  });
});

describe('MessageContent listing cards', () => {
  const ID = '6a0bf54e6c42aba37528aeb6';
  const URL = `https://projectdiablo2.com/market/listing/${ID}?display="Ohm Rune"`;
  const listing = (over: Partial<MarketListingEntry> = {}) =>
    ({
      _id: ID,
      hr_price: 0,
      price: '75 wss',
      bumped_at: '2026-05-19T05:29:49.989Z',
      is_ladder: true,
      is_hardcore: false,
      user: { username: 'drakehz' },
      item: {
        name: 'Ohm Rune',
        quality: { id: 2, name: 'Normal' },
        base: { name: 'Ohm Rune' },
        modifiers: [],
        socket_count: 0,
        item_level: 96,
        location: { storage: 'Shared Stash', stash_page: 3 },
        requirements: { level: 57 },
      },
      ...over,
    }) as unknown as MarketListingEntry;

  function renderWith(state: ChatListingState | undefined) {
    const listings = new Map<string, ChatListingState>(state ? [[ID, state]] : []);
    return render(
      <ItemsProvider items={[]}>
        <MessageContent content={`Hi, I'm interested in your ${URL}`}
          listings={listings} />
      </ItemsProvider>,
    );
  }

  it('shows a placeholder card while the listing loads', () => {
    renderWith({ status: 'loading' });
    expect(screen.getByLabelText('Loading listing')).not.toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows a listed item with its art, keeps price and stash for the popover, and opens on click', () => {
    renderWith({ status: 'listed', listing: listing() });
    const card = screen.getByRole('link');
    expect(card.getAttribute('href')).toBe(URL);
    expect(card.textContent).toBe('Ohm Rune');
    expect(card.querySelector('img')!.getAttribute('src')).toBe('/runes/Ohm_Rune.png');
    expect(within(card).queryByText('Unlisted')).toBeNull();

    fireEvent.click(card);
    expect(vi.mocked(openUrl)).toHaveBeenCalledWith(URL);
  });

  it('tags archived listings as unlisted', () => {
    renderWith({ status: 'unlisted', listing: listing() });
    expect(within(screen.getByRole('link')).getByText('Unlisted')).not.toBeNull();
  });

  it('falls back to the link chip when the listing does not exist or was not looked up', () => {
    renderWith({ status: 'missing' });
    expect(screen.getByRole('link').textContent).toBe('Ohm Rune');
    cleanup();
    renderWith(undefined);
    expect(screen.getByRole('link').textContent).toBe('Ohm Rune');
  });

  it('swaps the art for a placeholder icon when the image fails to load', () => {
    renderWith({ status: 'listed', listing: listing() });
    fireEvent.error(screen.getByRole('link').querySelector('img')!);
    expect(screen.getByRole('link').querySelector('img')).toBeNull();
  });
});
