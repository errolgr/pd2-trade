import {
    Button,
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
} from '@pd2-trader/ui';
import { useForm } from 'react-hook-form';

interface Values {
  account: string;
  price: string;
}

export const meta = {
  title: 'With validation',
  description:
    'react-hook-form wiring: `FormField` + `FormItem` / `FormLabel` / `FormControl` / `FormDescription` / `FormMessage` (rendered as Field parts); submit empty to see the error.',
  order: 0,
};

export default function WithValidationExample() {
  const form = useForm<Values>({ defaultValues: { account: 'Sorc_Errol', price: '' } });
  return (
    <Form {...form}>
      <form
        className="flex w-sidebar flex-col gap-4 rounded-lg border bg-surface p-4"
        onSubmit={form.handleSubmit(() => undefined)}
      >
        <FormField
          control={form.control}
          name="account"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Buyers whisper *account in game.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          rules={{ required: 'Enter a price in HR' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (HR)</FormLabel>
              <FormControl>
                <Input placeholder="0.5"
                  {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">List item</Button>
      </form>
    </Form>
  );
}
