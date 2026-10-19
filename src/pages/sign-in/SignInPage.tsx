import React, { useEffect, useRef, useState } from 'react';
import { usePanel } from '@/overlay';
import { useOAuth } from '@/hooks/useOAuth';
import { useOptions } from '@/hooks/useOptions';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { ScrollArea } from '@/components/ui/scroll-area';
import pd2Logo from '@/assets/pd2_logo.png';
import { X, Check, ChevronRight, Loader2 } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { WindowPanel } from '@/components/custom/window-chrome';
import { fadeInUp, listItem, listStagger } from '@/lib/motion';
import { cn } from '@/lib/utils';

function SignInContent() {
  const { startOAuthFlow } = useOAuth();
  const { updateSettings } = useOptions();
  const { close } = usePanel();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<string[] | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  // The panel unmounts when closed; abort the browser flow so it stops polling, frees the sign-in lock for the next
  // open, and never updates this unmounted component.
  const flowRef = useRef<AbortController | null>(null);
  useEffect(() => () => flowRef.current?.abort(), []);

  const handleSignIn = async () => {
    flowRef.current?.abort();
    const flow = new AbortController();
    flowRef.current = flow;
    const { signal } = flow;
    setLoading(true);
    try {
      const token = await startOAuthFlow(signal);
      if (signal.aborted) return;
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch user data to check accounts
      const response = await tauriFetch(`${BACKEND_URL}/api/auth/oauth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (signal.aborted) return;

      if (response.ok) {
        const data = await response.json();
        if (signal.aborted) return;
        const userAccounts = data?.user?.game?.accounts ?? [];
        console.log('[SignIn] Accounts found:', userAccounts);

        if (userAccounts.length <= 1) {
          // Single or no accounts — auto-select and close
          if (userAccounts.length === 1) {
            await updateSettings({ account: userAccounts[0] });
          }
          close();
        } else {
          // Multiple accounts — show selector
          setAccounts(userAccounts);
          setLoading(false);
        }
      } else {
        // Auth check failed but tokens are stored — just close
        close();
      }
    } catch (err) {
      if (signal.aborted) return;
      console.error('[SignIn] Error during sign-in flow:', err);
      setLoading(false);
    }
  };

  const handleSelectAccount = async (account: string) => {
    setSelectedAccount(account);
    await updateSettings({ account });
    close();
  };

  const handleLater = close;

  const closeButton = (
    <button
      type="button"
      onClick={handleLater}
      className="absolute top-2.5 right-2.5 z-10 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color,transform] duration-(--dur-fast) ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-95"
      aria-label="Close"
    >
      <X className="w-4 h-4" />
    </button>
  );

  // Account selection view
  if (accounts && accounts.length > 1) {
    return (
      <WindowPanel
        className="relative h-full w-full items-center justify-center gap-4 px-8 py-5 select-none"
        data-panel-drag
      >
        {closeButton}

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="flex flex-shrink-0 flex-col items-center gap-1.5 text-center"
        >
          <h1 className="text-lg font-semibold tracking-tight">Sign in to PD2 Trader</h1>
          <p className="text-sm text-muted-foreground">Multiple accounts found. Select which one to use.</p>
        </motion.div>

        <ScrollArea className="w-full max-w-xs min-h-0 flex-1"
          data-no-drag>
          <motion.div
            className="flex flex-col gap-2 p-0.5"
            role="listbox"
            aria-label="Game accounts"
            variants={listStagger}
            initial="hidden"
            animate="visible"
          >
            {accounts.map((account) => {
              const isSelected = selectedAccount === account;
              return (
                <motion.button
                  key={account}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  variants={listItem}
                  onClick={() => handleSelectAccount(account)}
                  disabled={selectedAccount !== null}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm font-medium outline-none',
                    'transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-(--dur-fast) ease-out',
                    'focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-[0.98]',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-glow'
                      : 'border-border bg-card/60 hover:border-primary/60 hover:bg-accent disabled:opacity-50',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase transition-colors duration-(--dur-fast)',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-foreground',
                    )}
                  >
                    {account.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{account}</span>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-[opacity,transform] duration-(--dur-fast) group-hover:translate-x-0.5 group-hover:opacity-100" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </ScrollArea>
      </WindowPanel>
    );
  }

  // Sign in view
  return (
    <WindowPanel className="relative h-full w-full items-center justify-center gap-5 px-8 select-none"
      data-panel-drag>
      {closeButton}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-20 mx-auto h-40 w-64 rounded-full bg-primary/15 blur-3xl"
      />
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="relative flex flex-col items-center gap-1.5 text-center"
      >
        <h1 className="text-xl font-semibold tracking-tight">Sign in to PD2 Trader</h1>
        <p className="text-sm text-muted-foreground">
          Connect your Project Diablo 2 account to access trading features.
        </p>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
        className="relative flex w-full max-w-xs flex-col items-center gap-2"
      >
        <Button onClick={handleSignIn}
          disabled={loading}
          aria-busy={loading}
          size="lg"
          className="w-full gap-2.5">
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <img src={pd2Logo}
              alt=""
              className="size-5 rounded-full ring-1 ring-primary-foreground/30" />
          )}
          {loading ? 'Opening browser...' : 'Sign in with PD2'}
        </Button>

        <Button variant="ghost"
          size="sm"
          onClick={handleLater}
          disabled={loading}
          className="text-muted-foreground">
          Later
        </Button>
      </motion.div>
    </WindowPanel>
  );
}

export default function SignInPage() {
  return (
    <MotionConfig reducedMotion="user">
      <SignInContent />
    </MotionConfig>
  );
}
