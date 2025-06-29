import { z } from 'zod';

export const shortcutFormSchema = z.object({
  type: z.enum(['note', 'negotiable', 'exact']),
  note: z.string().optional(),
  price: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === 'note') return !!data.note && data.note.length > 0;
    if (data.type === 'negotiable' || data.type === 'exact') return !!data.price && !!data.currency;
    return false;
  },
  {
    message: 'Please fill out the required fields.',
    path: ['note', 'price', 'currency'],
  }
);

export type ShortcutFormData = z.infer<typeof shortcutFormSchema>;

export const priceTypeOptions = [
  { value: 'exact', label: 'Exact Price' },
  { value: 'note', label: 'Note' },
  { value: 'negotiable', label: 'Negotiable Price' },
] as const; 