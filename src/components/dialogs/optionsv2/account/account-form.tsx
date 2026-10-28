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
import { cancelOAuthFlow, useOAuthFlowActive, useOAuthFlowLink } from '@/hooks/useOAuth';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, ExternalLink, LogOut, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { writeText } from '@/lib/browser-clipboard';
import { isTauri } from '@tauri-apps/api/core';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { SettingsGroup, SettingsRow } from '../settings-ui';
import { Trans, useTranslation } from '@/i18n';

const accountFormSchema = z.object({
  account: z.string().optional(),
  pd2Token: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export function AccountForm() {
  const { t } = useTranslation('settings');
  const { settings, updateSettings } = useOptions();
  const { authData, logout, startOAuthFlow } = usePd2Website();
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  // The flow's own state, not this form's: it outlives the form (switching sections remounts it) and may have been
  // started from the sign-in panel
  const loggingIn = useOAuthFlowActive();
  // The browser may not show up even when it "opened": the sign-in's link to copy into one
  const link = useOAuthFlowLink();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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

  const copyLink = async () => {
    if (!link) return;
    try {
      await writeText(link.url);
      setCopiedUrl(link.url);
    } catch (error) {
      console.warn('[Account] Could not copy the sign-in link:', error);
    }
  };
  const linkCopied = link !== null && copiedUrl === link.url;

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
                <AlertTitle>{t('account.noAccounts.title')}</AlertTitle>
                <AlertDescription>{t('account.noAccounts.description')}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <SettingsGroup
          title={t('account.group')}
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
              {authData
                ? username
                  ? t('account.status.signedInAs', { username })
                  : t('account.status.signedIn')
                : t('account.status.signedOut')}
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
                  label={t('account.token.label')}
                  description={
                    <Trans
                      t={t}
                      i18nKey="account.token.description"
                      components={{
                        site: (
                          <a
                            href="https://projectdiablo2.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                          />
                        ),
                        icon: <ExternalLink className="w-3 h-3" />,
                      }}
                    />
                  }
                  control={
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('account.token.placeholder')}
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
                label={t('account.account.label')}
                description={
                  accounts.length > 0
                    ? t('account.account.linked', { count: accounts.length })
                    : t('account.account.signInToLoad')
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
                            placeholder={
                              accounts.length === 0
                                ? t('account.account.authenticateFirst')
                                : t('account.account.select')
                            }
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
                        {loggingOut ? t('account.loggingOut') : t('account.logOut')}
                      </Button>
                    ) : (
                      <>
                        <Button type="button"
                          onClick={handleLogin}
                          disabled={loggingIn}
                          className="min-w-28">
                          {loggingIn ? <Loader2 className="animate-spin" /> : <LogIn />}
                          {loggingIn ? t('account.loggingIn') : t('account.logIn')}
                        </Button>
                        {/* Closing the browser tab leaves the flow polling for up to 10 minutes: cancel to retry */}
                        {loggingIn && (
                          <Button type="button"
                            variant="outline"
                            onClick={cancelOAuthFlow}>
                            {t('common:actions.cancel')}
                          </Button>
                        )}
                      </>
                    )}
                  </>
                }
              >
                <FormMessage />
                {loggingIn && link && (
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={cn(
                        'text-[13px] leading-relaxed',
                        link.openFailed ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {link.openFailed ? t('account.signInLink.openFailed') : t('account.signInLink.notOpened')}
                    </p>
                    <Button type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyLink}>
                      {linkCopied ? <Check /> : <Copy />}
                      {linkCopied ? t('app:signIn.linkCopied') : t('app:signIn.copyLink')}
                    </Button>
                  </div>
                )}
              </SettingsRow>
            )}
          />
        </SettingsGroup>
      </div>
    </Form>
  );
}
