export type FormattedItem = {
  key: string;
  item: string;
  amount: number;
  price: number;
  value: number;
};

export type FormattedStashData = {
  currency: { items: FormattedItem[]; total: number };
  runes: { items: FormattedItem[]; total: number };
  ubers: { items: FormattedItem[]; total: number };
};

export type FormattedStashCategory = keyof FormattedStashData;
