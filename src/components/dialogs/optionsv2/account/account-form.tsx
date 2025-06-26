import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useOptions } from '@/hooks/useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { emit } from '@tauri-apps/api/event';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';

const accountFormSchema = z.object({
  account: z.string().min(1, 'Please select an account'),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export function AccountForm() {
  const { settings, updateSettings } = useOptions();
  const { authData } = usePd2Website();
  const [accounts, setAccounts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
      if (authData?.user?.game?.accounts) {
        setAccounts(authData.user.game.accounts);
      }
  }, [authData]);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { account: settings?.account || '' },
  });

  const onSubmit = async (values: AccountFormValues) => {
    setSaving(true);
    await updateSettings({ account: values.account });
    await new Promise((resolve) => setTimeout(resolve, 200)); // artificial delay
    setSaving(false);
    emit('toast-event', 'Account updated!');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
        <FormField
          control={form.control}
          name="account"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc: string) => (
                      <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="self-start cursor-pointer mt-2" disabled={saving}>
          {saving ? <span className="animate-spin mr-2">⏳</span> : null}
          {saving ? 'Saving...' : 'Update account'}
        </Button>
      </form>
    </Form>
  );
} 