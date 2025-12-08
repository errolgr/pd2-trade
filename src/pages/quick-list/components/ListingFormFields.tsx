import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from "lucide-react";
import { ShortcutFormData } from './types';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';

interface ListingFormFieldsProps {
  form: UseFormReturn<ShortcutFormData>;
  selectedItem: GameStashItem | null;
  currentListings: MarketListingEntry[];
  submitLoading: boolean;
  onSubmit: (values: ShortcutFormData) => Promise<void>;
  allowQueue?: boolean; // Allow submission when no item selected (for queuing)
}

const ListingFormFields: React.FC<ListingFormFieldsProps> = ({
  form,
  selectedItem,
  currentListings,
  submitLoading,
  onSubmit,
  allowQueue = false
}) => {
  const isAlreadyListed = selectedItem && currentListings.find((c) => c.item.hash === selectedItem.hash);
  
  // Watch note and price fields to determine if button should be disabled
  const note = form.watch('note');
  const price = form.watch('price');
  const hasNote = !!note && note.toString().trim().length > 0;
  const hasPrice = !!price && (typeof price === 'number' ? price > 0 : Number(price) > 0);
  const isFormValid = hasNote || hasPrice;

  return (
    <div className="flex flex-wrap items-end gap-1">
      {/* Note Input */}
      <FormField
        control={form.control}
        name="note"
        defaultValue={form.getValues('note')}
        render={({ field }) => (
          <FormItem className="flex-1 m-0 p-0 min-w-0">
            <FormLabel className="sr-only">Note</FormLabel>
            <FormControl>
              <Input placeholder="Note..." {...field} autoComplete={'off'} value={form.getValues('note') || ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* HR Price Input */}
      <FormField
        control={form.control}
        name="price"
        defaultValue={form.getValues('price')}
        render={({ field }) => (
          <FormItem className="m-0 p-0 min-w-0 w-20">
            <FormLabel className="sr-only">HR</FormLabel>
            <FormControl>
              <Input type="number" min={0} step={0.01} placeholder="HR" {...field} value={form.getValues('price') || ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Submit Button */}
      {isAlreadyListed ? (
        <Button type="submit" style={{fontFamily: 'DiabloFont', fontWeight: 600}} disabled={submitLoading || !isFormValid}>
          {submitLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> : null}
          Update
        </Button>
      ) : (
        <Button type="submit" disabled={(!selectedItem && !allowQueue) || submitLoading || !isFormValid} style={{fontFamily: 'DiabloFont', fontWeight: 600}}>
          {submitLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> : null}
          {allowQueue && !selectedItem ? 'Queue Item' : 'Post'}
        </Button>
      )}
    </div>
  );
};

export default ListingFormFields; 