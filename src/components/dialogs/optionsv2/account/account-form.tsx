import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOptions } from '@/hooks/useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { emit } from '@/lib/browser-events';
import { openUrl } from '@/lib/browser-opener';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, LogOut, LogIn, AlertCircle } from 'lucide-react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const accountFormSchema = z.object({
  account: z.string().optional(),
  pd2Token: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export function AccountForm() {
  const { settings, updateSettings } = useOptions();
  const { authData, logout } = usePd2Website();
  const [accounts, setAccounts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      account: settings?.account || '',
      pd2Token: settings?.pd2Token || '',
    },
  });

  // Update form when settings change
  useEffect(() => {
    if (settings) {
      form.reset({
        account: settings.account || '',
        pd2Token: settings.pd2Token || '',
      });
    }
  }, [settings, form]);

  useEffect(() => {
    if (authData?.user?.game?.accounts) {
      setAccounts(authData.user.game.accounts);
    } else {
      setAccounts([]);
    }
  }, [authData]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      if (isTauri()) {
        await invoke('open_project_diablo2_webview');
      } else {
        window.open('https://projectdiablo2.com/auth', '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open authentication:', error);
    } finally {
      setLoggingIn(false);
    }
  };

  const onSubmit = async (values: AccountFormValues) => {
    setSaving(true);
    const updates: any = { account: values.account };

    // Only update token if it was changed
    if (values.pd2Token && values.pd2Token !== settings?.pd2Token) {
      updates.pd2Token = values.pd2Token;
    }

    await updateSettings(updates);
    await new Promise((resolve) => setTimeout(resolve, 200)); // artificial delay
    setSaving(false);
    await emit('toast-event', { title: 'PD2 Trader', description: 'Account updated!' });
  };

  return (
    <Form {...form}>
      <ScrollArea className="pr-2">
        <form onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-y-4 max-h-[330px]">
          {accounts.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No accounts available</AlertTitle>
              <AlertDescription>
                If you don&apos;t have the right account selected, you may receive 404 errors when listing items. Please
                authenticate to load your accounts.
              </AlertDescription>
            </Alert>
          )}
          {!isTauri() && (
            <FormField
              control={form.control}
              name="pd2Token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PD2 Token</FormLabel>
                  <FormControl>
                    <Input type="password"
                      placeholder="Enter your PD2 token"
                      className="w-full"
                      {...field} />
                  </FormControl>
                  <FormDescription>
                    Get your token from{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        openUrl('https://projectdiablo2.com', settings?.pd2Token);
                      }}
                      className="text-blue-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      projectdiablo2.com
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    after logging in. Check your browser&apos;s localStorage for &apos;pd2-token&apos;.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="account"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={accounts.length === 0}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={accounts.length === 0 ? 'Authenticate first' : 'Select an account'} />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc: string) => (
                          <SelectItem key={acc}
                            value={acc}>
                            {acc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {authData ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="gap-2"
                      >
                        <LogOut className="h-3 w-3" />
                        {loggingOut ? 'Logging out...' : 'Log out'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleLogin}
                        disabled={loggingIn}
                        className="gap-2"
                      >
                        <LogIn className="h-3 w-3" />
                        {loggingIn ? 'Logging in...' : 'Log in'}
                      </Button>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </ScrollArea>
      <Button
        type="submit"
        className="self-start cursor-pointer mt-2"
        disabled={saving}
        onClick={form.handleSubmit(onSubmit)}
      >
        {saving ? <span className="animate-spin mr-2">⏳</span> : null}
        {saving ? 'Saving...' : 'Update account'}
      </Button>
    </Form>
  );
}
