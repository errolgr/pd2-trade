import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, NotebookPen, Settings2 } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useOptions } from '@/hooks/useOptions';
import { ShortcutFormData } from './types';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import MacroManagerSheet, { isValidMacro, applyMacroTemplate, getPlaceholders, NoteMacro } from './MacroManagerSheet';

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
  allowQueue = false,
}) => {
  const { settings } = useOptions();
  const macros = (settings?.listingNoteMacros ?? []).filter(isValidMacro);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [pendingMacro, setPendingMacro] = React.useState<NoteMacro | null>(null);
  const [placeholderValues, setPlaceholderValues] = React.useState<Record<string, string>>({});
  const pendingPlaceholders = pendingMacro ? getPlaceholders(pendingMacro.text) : [];
  const isAlreadyListed = selectedItem && currentListings.find((c) => c.item.hash === selectedItem.hash);

  const handleMacroClick = (macro: NoteMacro) => {
    const placeholders = getPlaceholders(macro.text);
    if (placeholders.length > 0) {
      setPendingMacro(macro);
      setPlaceholderValues({});
    } else {
      applyMacro(macro, {});
    }
  };

  const applyMacro = (macro: NoteMacro, values: Record<string, string>) => {
    const itemName = selectedItem?.name;
    const note = applyMacroTemplate(macro.text, itemName, values);
    form.setValue('note', note, { shouldValidate: true });
    setPendingMacro(null);
    setPlaceholderValues({});
    setSheetOpen(false);
  };

  // Watch note and price fields to determine if button should be disabled
  const note = form.watch('note');
  const price = form.watch('price');
  const hasNote = !!note && note.toString().trim().length > 0;
  const hasPrice = !!price && (typeof price === 'number' ? price > 0 : Number(price) > 0);
  const isFormValid = hasNote || hasPrice;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Macros Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setPendingMacro(null);
        }}
      >
        <SheetTrigger asChild>
          <Button type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="Note macros">
            <NotebookPen className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Note Macros</SheetTitle>
            <SheetDescription>Click a macro to fill the note field, or manage your macros below.</SheetDescription>
          </SheetHeader>
          {pendingMacro ? (
            <div className="flex flex-col gap-3 px-4">
              <p className="text-sm text-muted-foreground">
                Fill in the values for <span className="font-medium text-foreground">{pendingMacro.label}</span>:
              </p>
              <p className="text-xs text-muted-foreground border rounded-md px-2 py-1 bg-secondary">
                {pendingMacro.text}
              </p>
              {pendingPlaceholders.map((name, i) => (
                <Input
                  key={name}
                  placeholder={name}
                  value={placeholderValues[name] || ''}
                  onChange={(e) => setPlaceholderValues((prev) => ({ ...prev, [name]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyMacro(pendingMacro, placeholderValues);
                    }
                  }}
                  autoFocus={i === 0}
                />
              ))}
              <div className="flex gap-2">
                <Button type="button"
                  size="sm"
                  onClick={() => applyMacro(pendingMacro, placeholderValues)}>
                  Apply
                </Button>
                <Button type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingMacro(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <MacroManagerSheet onApply={handleMacroClick} />
          )}
        </SheetContent>
      </Sheet>

      {/* Note Input */}
      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem className="flex-1 m-0 p-0 min-w-0">
            <FormLabel className="sr-only">Note</FormLabel>
            <FormControl>
              <Input placeholder="Note..."
                {...field}
                value={field.value || ''}
                autoComplete={'off'} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* HR Price Input */}
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem className="m-0 p-0 min-w-0 w-20">
            <FormLabel className="sr-only">HR</FormLabel>
            <FormControl>
              <Input type="number"
                min={0}
                step={0.01}
                placeholder="HR"
                {...field}
                value={field.value || ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Submit Button */}
      {isAlreadyListed ? (
        <Button
          type="submit"
          style={{ fontFamily: 'DiabloFont', fontWeight: 600 }}
          disabled={submitLoading || !isFormValid}
        >
          {submitLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> : null}
          Update
        </Button>
      ) : (
        <Button
          type="submit"
          disabled={(!selectedItem && !allowQueue) || submitLoading || !isFormValid}
          style={{ fontFamily: 'DiabloFont', fontWeight: 600 }}
        >
          {submitLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> : null}
          {allowQueue && !selectedItem ? 'Queue Item' : 'Post'}
        </Button>
      )}
    </div>
  );
};

export default ListingFormFields;
