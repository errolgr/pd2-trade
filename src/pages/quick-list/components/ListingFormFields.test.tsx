// @vitest-environment happy-dom
import React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Form } from '@/components/ui/form';
import { useOptions } from '@/hooks/useOptions';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import ListingFormFields from './ListingFormFields';
import { shortcutFormSchema, type ShortcutFormData } from './types';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));

const shako = { hash: 'h1', name: 'Harlequin Crest' } as GameStashItem;
const listingFor = (item: GameStashItem) => ({ _id: 'L1', item: { hash: item.hash } }) as MarketListingEntry;

let macros: unknown[];
let onSubmit: Mock<(values: ShortcutFormData) => Promise<void>>;
let formRef: { current: UseFormReturn<ShortcutFormData> | null };
const captureForm = (form: UseFormReturn<ShortcutFormData>) => {
  formRef.current = form;
};

function Harness(props: {
  selectedItem?: GameStashItem | null;
  currentListings?: MarketListingEntry[];
  submitLoading?: boolean;
  allowQueue?: boolean;
}) {
  const form = useForm<ShortcutFormData>({
    resolver: zodResolver(shortcutFormSchema),
    defaultValues: { type: 'exact', note: '', price: '', currency: 'HR' },
  });
  captureForm(form);
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ListingFormFields
          form={form}
          selectedItem={props.selectedItem === undefined ? shako : props.selectedItem}
          currentListings={props.currentListings ?? []}
          submitLoading={props.submitLoading ?? false}
          onSubmit={onSubmit}
          allowQueue={props.allowQueue}
        />
      </form>
    </Form>
  );
}

const submitButton = () => screen.getByRole('button', { name: /^(Post|Update|Queue Item)$/ }) as HTMLButtonElement;
const noteInput = () => screen.getByPlaceholderText('Note...') as HTMLInputElement;
const priceInput = () => screen.getByPlaceholderText('HR') as HTMLInputElement;

beforeEach(() => {
  macros = [];
  onSubmit = vi.fn();
  formRef = { current: null };
  vi.mocked(useOptions).mockImplementation(
    () => ({ settings: { listingNoteMacros: macros }, updateSettings: vi.fn() }) as never,
  );
});
afterEach(cleanup);

describe('submit button', () => {
  it('reads Post for an unlisted item, Update for a listed one, Queue Item when queuing', () => {
    const { unmount } = render(<Harness />);
    expect(submitButton().textContent).toBe('Post');
    unmount();

    render(<Harness currentListings={[listingFor(shako)]} />);
    expect(submitButton().textContent).toBe('Update');
    cleanup();

    render(<Harness selectedItem={null}
      allowQueue />);
    expect(submitButton().textContent).toBe('Queue Item');
  });

  it('stays disabled until a note or a positive price is entered', () => {
    render(<Harness />);
    expect(submitButton().disabled).toBe(true);
    fireEvent.change(priceInput(), { target: { value: '0' } });
    expect(submitButton().disabled).toBe(true);
    fireEvent.change(noteInput(), { target: { value: '   ' } });
    expect(submitButton().disabled).toBe(true);
    fireEvent.change(priceInput(), { target: { value: '1.5' } });
    expect(submitButton().disabled).toBe(false);
  });

  it('requires a selected item unless queuing is allowed', () => {
    const { unmount } = render(<Harness selectedItem={null} />);
    fireEvent.change(noteInput(), { target: { value: 'offer' } });
    expect(submitButton().disabled).toBe(true);
    unmount();

    render(<Harness selectedItem={null}
      allowQueue />);
    fireEvent.change(noteInput(), { target: { value: 'offer' } });
    expect(submitButton().disabled).toBe(false);
  });

  it('is disabled while a submit is in flight', () => {
    render(<Harness submitLoading
      currentListings={[listingFor(shako)]} />);
    fireEvent.change(noteInput(), { target: { value: 'offer' } });
    expect(submitButton().disabled).toBe(true);
  });

  it('submits the entered note and price through the form', async () => {
    render(<Harness />);
    fireEvent.change(noteInput(), { target: { value: 'pc' } });
    fireEvent.change(priceInput(), { target: { value: '3' } });
    // happy-dom does not turn submit-button clicks into form submission events.
    fireEvent.submit(submitButton().closest('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ note: 'pc', price: '3' });
  });
});

describe('note macros', () => {
  async function openSheet() {
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Note macros'));
    });
  }

  it('counts only valid macros on the trigger badge', () => {
    macros = [{ label: 'a', text: 'x' }, { label: 'broken' }, { label: 'b', text: 'y' }];
    render(<Harness />);
    expect(screen.getByLabelText('Note macros').textContent).toBe('2');
  });

  it('applies a placeholder-free macro with the selected item name and closes the sheet', async () => {
    macros = [{ label: 'WTS', text: 'WTS {itemName} fast' }];
    render(<Harness />);
    await openSheet();
    await act(async () => {
      fireEvent.click(screen.getByTitle('Use this macro'));
    });
    expect(noteInput().value).toBe('WTS Harlequin Crest fast');
    expect(screen.queryByText('Note Macros')).toBeNull();
    // Setting the note enables posting without a price.
    expect(submitButton().disabled).toBe(false);
  });

  it('prompts for placeholder values and applies them on Enter', async () => {
    macros = [{ label: 'Sockets', text: '{itemName} {os}os {eth}' }];
    render(<Harness />);
    await openSheet();
    await act(async () => {
      fireEvent.click(screen.getByTitle('Use this macro'));
    });
    expect(noteInput().value).toBe('');
    const os = screen.getByPlaceholderText('os');
    fireEvent.change(os, { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('eth'), { target: { value: 'eth' } });
    await act(async () => {
      fireEvent.keyDown(os, { key: 'Enter' });
    });
    expect(noteInput().value).toBe('Harlequin Crest 2os eth');
  });

  it('leaves unfilled placeholders and unknown item names verbatim', async () => {
    macros = [{ label: 'Sockets', text: '{itemName} {os}os' }];
    render(<Harness selectedItem={null}
      allowQueue />);
    await openSheet();
    await act(async () => {
      fireEvent.click(screen.getByTitle('Use this macro'));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply/ }));
    });
    expect(noteInput().value).toBe('{itemName} {os}os');
  });

  it('cancelling the placeholder prompt returns to the macro list without touching the note', async () => {
    macros = [{ label: 'Sockets', text: '{os}os' }];
    render(<Harness />);
    fireEvent.change(noteInput(), { target: { value: 'keep' } });
    await openSheet();
    await act(async () => {
      fireEvent.click(screen.getByTitle('Use this macro'));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    expect(screen.queryByPlaceholderText('os')).toBeNull();
    expect(screen.queryByTitle('Use this macro')).not.toBeNull();
    expect(noteInput().value).toBe('keep');
    expect(formRef.current!.getValues('note')).toBe('keep');
  });
});
