import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, NotebookPen } from 'lucide-react';
import { DUR, EASE_OUT, fadeIn, slideInRight } from '@/lib/motion';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useOptions } from '@/hooks/useOptions';
import { Trans, useTranslation } from '@/i18n';
import { ShortcutFormData } from './types';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import MacroManagerSheet, {
  isValidMacro,
  applyMacroTemplate,
  getPlaceholders,
  NoteMacro,
  MacroTemplate,
} from './MacroManagerSheet';

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
  const { t } = useTranslation(['quickList', 'common']);
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

  const submitLabel = isAlreadyListed
    ? t('form.update')
    : allowQueue && !selectedItem
      ? t('form.queueItem')
      : t('form.post');

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card/50 p-1.5 shadow-xs transition-colors duration-(--dur-fast) focus-within:border-ring/50">
      {/* Macros Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setPendingMacro(null);
        }}
      >
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            title={t('form.noteMacros')}
            aria-label={t('form.noteMacros')}
          >
            <NotebookPen className="h-4 w-4" />
            {macros.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none tabular-nums text-primary-foreground ring-2 ring-card">
                {macros.length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left"
          className="gap-0">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/12 text-primary">
                <NotebookPen className="size-4" />
              </span>
              {t('form.macrosTitle')}
            </SheetTitle>
            <SheetDescription>{t('form.macrosDescription')}</SheetDescription>
          </SheetHeader>
          <AnimatePresence mode="wait"
            initial={false}>
            {pendingMacro ? (
              <motion.div
                key="fill"
                variants={slideInRight}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col gap-3 px-4"
              >
                <p className="text-sm text-muted-foreground">
                  <Trans
                    t={t}
                    i18nKey="form.fillValues"
                    values={{ label: pendingMacro.label }}
                    components={{ label: <span className="font-semibold text-foreground" /> }}
                  />
                </p>
                <div className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground">
                  <MacroTemplate text={pendingMacro.text} />
                </div>
                {pendingPlaceholders.map((name, i) => (
                  <label key={name}
                    className="flex flex-col gap-1">
                    <span className="font-mono text-[11px] text-muted-foreground">{`{${name}}`}</span>
                    <Input
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
                  </label>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button type="button"
                    size="sm"
                    onClick={() => applyMacro(pendingMacro, placeholderValues)}>
                    <Check className="size-4" />
                    {t('common:actions.apply')}
                  </Button>
                  <Button type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingMacro(null)}>
                    {t('common:actions.cancel')}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex min-h-0 flex-1 flex-col"
              >
                <MacroManagerSheet onApply={handleMacroClick} />
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>

      {/* Note Input */}
      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem className="flex-1 m-0 p-0 min-w-0">
            <FormLabel className="sr-only">{t('form.note')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('form.notePlaceholder')}
                {...field}
                value={field.value || ''}
                autoComplete={'off'}
              />
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
            <FormLabel className="sr-only">{t('form.hr')}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder={t('form.hr')}
                className="tabular-nums"
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        className="min-w-20"
        style={{ fontFamily: 'DiabloFont', fontWeight: 600 }}
        disabled={
          isAlreadyListed
            ? submitLoading || !isFormValid
            : (!selectedItem && !allowQueue) || submitLoading || !isFormValid
        }
      >
        {submitLoading ? <Loader2 className="animate-spin h-4 w-4 inline" /> : null}
        <AnimatePresence mode="wait"
          initial={false}>
          <motion.span
            key={submitLabel}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DUR.fast, ease: EASE_OUT }}
          >
            {submitLabel}
          </motion.span>
        </AnimatePresence>
      </Button>
    </div>
  );
};

export default ListingFormFields;
