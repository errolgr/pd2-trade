// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openUrl } from '@/lib/browser-opener';
import { MessageContent } from './MessageContent';

vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));

const LISTING = 'https://www.projectdiablo2.com/market/listing/0123456789abcdef';

afterEach(cleanup);

/** Rendered segments in order: plain text spans as strings, links as { text, href }. */
function segments(content: string, isOwnMessage = false) {
  const { container } = render(<MessageContent content={content}
    isOwnMessage={isOwnMessage} />);
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
        <MessageContent content={url}
          isOwnMessage />
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

  // BUG: MessageContent.tsx:47 calls decodeURIComponent on the raw display param without a try/catch.
  // A chat message containing a malformed escape (e.g. "?display=100%") throws URIError during render,
  // which unmounts the whole chat window since there is no error boundary.
  it.fails('renders a listing URL whose display name has a malformed percent escape', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const url = `${LISTING}?display=100%`;
    expect(segments(url)).toEqual([{ text: '100%', href: url }]);
  });
});
