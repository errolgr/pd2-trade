import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOptions } from '@/hooks/useOptions';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { cancelOAuthFlow, useOAuthFlowActive } from '@/hooks/useOAuth';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, LogOut, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { SettingsGroup, SettingsRow } from '../settings-ui';

const accountFormSchema = z.object({
  account: z.string().optional(),
  pd2Token: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export function AccountForm() {
  const { settings, updateSettings } = useOptions();
  const { authData, logout, startOAuthFlow } = usePd2Website();
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  // The flow's own state, not this form's: it outlives the form (switching sections remounts it) and may have been
  // started from the sign-in panel
  const loggingIn = useOAuthFlowActive();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      account: settings?.account || '',
      pd2Token: settings?.pd2Token || '',
    },
  });

  // Update form when settings change externally
  useEffect(() => {
    if (settings) {
      form.reset(
        {
          account: settings.account || '',
          pd2Token: settings.pd2Token || '',
        },
        { keepDirty: false },
      );
    }
  }, [settings, form]);

  // Auto-save on any change
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  useEffect(() => {
    const subscription = form.watch((values) => {
      const current = settingsRef.current;
      if (values.account === current?.account && values.pd2Token === current?.pd2Token) return;
      const updates: any = { account: values.account };
      if (values.pd2Token && values.pd2Token !== current?.pd2Token) {
        updates.pd2Token = values.pd2Token;
      }
      updateSettings(updates);
    });
    return () => subscription.unsubscribe();
  }, [form, updateSettings]);

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
    try {
      await startOAuthFlow();
    } catch (error) {
      console.error('Failed to start OAuth flow:', error);
    }
  };

  const username = authData?.user?.username;

  return (
    <Form {...form}>
      <div className="flex flex-col gap-y-6">
        <AnimatePresence initial={false}>
          {accounts.length === 0 && (
            <motion.div key="no-accounts"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              exit="exit">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No accounts available</AlertTitle>
                <AlertDescription>
                  If you don&apos;t have the right account selected, you may receive 404 errors when listing items.
                  Please authenticate to load your accounts.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <SettingsGroup
          title="PD2 account"
          aside={
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium',
                authData ? 'text-success' : 'text-muted-foreground',
              )}
            >
              <span
                aria-hidden
                className={cn('size-1.5 rounded-full', authData ? 'bg-success shadow-glow' : 'bg-muted-foreground/50')}
              />
              {authData ? (username ? `Signed in as ${username}` : 'Signed in') : 'Signed out'}
            </span>
          }
        >
          {!isTauri() && (
            <FormField
              control={form.control}
              name="pd2Token"
              render={({ field }) => (
                <SettingsRow
                  layout="stacked"
                  label="PD2 Token"
                  description={
                    <>
                      Get your token from{' '}
                      <a
                        href="https://projectdiablo2.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                      >
                        projectdiablo2.com
                        <ExternalLink className="w-3 h-3" />
                      </a>{' '}
                      after logging in. Check your browser&apos;s localStorage for &apos;pd2-token&apos;.
                    </>
                  }
                  control={
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your PD2 token"
                        className="w-full"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                  }
                >
                  <FormMessage />
                </SettingsRow>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="account"
            render={({ field }) => (
              <SettingsRow
                label="Account"
                description={
                  accounts.length > 0
                    ? `${accounts.length} linked game account${accounts.length === 1 ? '' : 's'}. Used for listings and offers.`
                    : 'Sign in to load the game accounts linked to your PD2 profile.'
                }
                control={
                  <>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={accounts.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="w-[220px]">
                          <SelectValue
                            placeholder={accounts.length === 0 ? 'Authenticate first' : 'Select an account'}
                          />
                        </SelectTrigger>
                      </FormControl>
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
                        className="min-w-28"
                      >
                        {loggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
                        {loggingOut ? 'Logging out...' : 'Log out'}
                      </Button>
                    ) : (
                      <>
                        <Button type="button"
                          onClick={handleLogin}
                          disabled={loggingIn}
                          className="min-w-28">
                          {loggingIn ? <Loader2 className="animate-spin" /> : <LogIn />}
                          {loggingIn ? 'Logging in...' : 'Log in'}
                        </Button>
                        {/* Closing the browser tab leaves the flow polling for up to 10 minutes: cancel to retry */}
                        {loggingIn && (
                          <Button type="button"
                            variant="outline"
                            onClick={cancelOAuthFlow}>
                            Cancel
                          </Button>
                        )}
                      </>
                    )}
                  </>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>
      </div>
    </Form>
  );
}
