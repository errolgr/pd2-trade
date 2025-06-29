import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from "lucide-react";
import { ShortcutFormData, priceTypeOptions } from './types';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';

interface ListingFormFieldsProps {
  form: UseFormReturn<ShortcutFormData>;
  type: string;
  selectedItem: GameStashItem | null;
  currentListings: MarketListingEntry[];
  submitLoading: boolean;
  onSubmit: (values: ShortcutFormData) => Promise<void>;
}

const ListingFormFields: React.FC<ListingFormFieldsProps> = ({
  form,
  type,
  selectedItem,
  currentListings,
  submitLoading,
  onSubmit
}) => {
  const isAlreadyListed = selectedItem && currentListings.find((c) => c.item.hash === selectedItem.hash);

  return (
    <div className="flex flex-wrap items-end gap-1">
      {/* Listing Type Dropdown */}
      <FormField
        control={form.control}
        name="type"
        defaultValue={form.getValues('type')}
        render={({ field }) => (
          <FormItem className="m-0 p-0 min-w-50">
            <FormLabel className="sr-only">Listing Type</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className='w-full'>
                  <SelectValue>{priceTypeOptions.find(opt => opt.value === field.value)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {priceTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Note or Price Input */}
      {type === 'note' ? (
        <FormField
          control={form.control}
          name="note"
          defaultValue={form.getValues('note')}
          render={({ field }) => (
            <FormItem className="flex-1 m-0 p-0 min-w-0 w-14">
              <FormLabel className="sr-only">Note</FormLabel>
              <FormControl>
                <Input placeholder="Enter a note..." {...field} autoComplete={'off'}  value={form.getValues('note')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          control={form.control}
          name="price"
          defaultValue={form.getValues('price')}
          render={({ field }) => (
            <FormItem className="flex-1 p-0 min-w-0 w-30">
              <FormLabel className="sr-only">HR</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={0.01} placeholder="HR" {...field} value={form.getValues('price')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      
      {/* Submit Button */}
      {isAlreadyListed ? (
        <Button type="submit" style={{fontFamily: 'DiabloFont', fontWeight: 600}} disabled={submitLoading}>
          {submitLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> : null}
          Update
        </Button>
      ) : (
        <Button type="submit" disabled={!selectedItem || submitLoading} style={{fontFamily: 'DiabloFont', fontWeight: 600}}>
          {submitLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> : null}
          Post
        </Button>
      )}
    </div>
  );
};

export default ListingFormFields; 