import React, { useState } from 'react';
import { usePanel, useOverlay } from '@/overlay';
import { cancelOAuthFlow, useOAuth, useOAuthFlowActive } from '@/hooks/useOAuth';
import { useOptions } from '@/hooks/useOptions';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { ScrollArea } from '@/components/ui/scroll-area';
import pd2Logo from '@/assets/pd2_logo.png';
import { X, Check, ChevronRight, Loader2, ShieldCheck, KeyRound, Eye, ArrowRight } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { WindowPanel } from '@/components/custom/window-chrome';
import { fadeInUp, listItem, listStagger } from '@/lib/motion';
import { cn } from '@/lib/utils';

const TRUST_POINTS = [
  { icon: ShieldCheck, label: 'Official PD2 login' },
  { icon: KeyRound, label: 'No password shared' },
  { icon: Eye, label: 'Read-only stash' },
] as const;

/** Themed backdrop: accent bloom behind the header and a hairline highlight along the top edge. */
function Backdrop() {
  return (
    <div aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-28 left-1/2 size-72 -translate-x-1/2 rounded-full bg-glow/15 blur-3xl" />
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-glow/60 to-transparent" />
    </div>
  );
}

/** "PD2 Trader" wordmark with a one-line lead-in; shared by both views. No logo up here: the PD2 logo only appears on the
 * OAuth button, since this is a third-party app, not an official PD2 one. */
function BrandHeader({ eyebrow, lead, compact = false }: { eyebrow: string; lead: string; compact?: boolean }) {
  return (
    <div className="relative flex shrink-0 flex-col items-center text-center">
      <motion.div variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</span>
        <h1
          className={cn('font-bold leading-none tracking-wide', compact ? 'text-2xl' : 'text-[28px]')}
          style={{ fontFamily: 'DiabloFont' }}
        >
          PD2 Trader
        </h1>
        <p className="mt-1.5 max-w-[19rem] text-sm leading-snug text-muted-foreground">{lead}</p>
      </motion.div>
    </div>
  );
}

function SignInContent() {
  const { startOAuthFlow } = useOAuth();
  const { updateSettings } = useOptions();
  const { close, payload } = usePanel<'signIn'>();
  const { openPanel, closePanel } = useOverlay();
  // The browser flow outlives this panel: switching to the browser closes it (closeOnBlur), and the flow may have
  // been started from Settings. Local state only covers the account lookup that follows it.
  const flowActive = useOAuthFlowActive();
  const [lookingUp, setLookingUp] = useState(false);
  const loading = flowActive || lookingUp;
  const accounts = payload?.accounts ?? null;
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Runs to the end even after the panel closed, so it only goes through the overlay (not this component's state)
  // to finish: the account picker reopens the panel when the login has several game accounts.
  const handleSignIn = async () => {
    setLookingUp(true);
    try {
      const token = await startOAuthFlow();
      if (!token) return;

      // Fetch user data to check accounts
      const response = await tauriFetch(`${BACKEND_URL}/api/auth/oauth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userAccounts: string[] = data?.user?.game?.accounts ?? [];
        console.log('[SignIn] Accounts found:', userAccounts);

        if (userAccounts.length <= 1) {
          // Single or no accounts — auto-select and close
          if (userAccounts.length === 1) {
            await updateSettings({ account: userAccounts[0] });
          }
          closePanel('signIn');
        } else {
          // Multiple accounts — show selector
          openPanel('signIn', { accounts: userAccounts });
        }
      } else {
        // Auth check failed but tokens are stored — just close
        closePanel('signIn');
      }
    } catch (err) {
      console.error('[SignIn] Error during sign-in flow:', err);
    } finally {
      setLookingUp(false);
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
      <WindowPanel className="relative h-full w-full gap-4 px-8 pt-7 pb-5 select-none"
        data-panel-drag>
        <Backdrop />
        {closeButton}

        <BrandHeader
          compact
          eyebrow="Almost there"
          lead="Several game accounts are linked to this login. Pick the one to trade with."
        />

        <ScrollArea className="relative w-full min-h-0 flex-1"
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
                      ? 'border-glow/60 bg-glow/10 shadow-glow'
                      : 'border-border bg-surface-elevated hover:border-glow/50 hover:bg-accent disabled:opacity-50',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase transition-colors duration-(--dur-fast)',
                      isSelected
                        ? 'bg-glow text-background'
                        : 'bg-muted text-muted-foreground group-hover:bg-glow/20 group-hover:text-foreground',
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
    <WindowPanel
      className="relative h-full w-full items-center justify-center gap-6 px-8 py-7 select-none"
      data-panel-drag
    >
      <Backdrop />
      {closeButton}

      <BrandHeader
        eyebrow="Sign in to"
        lead="Link your Project Diablo 2 account to price check, list items and chat in-game."
      />

      <motion.ul
        variants={listStagger}
        initial="hidden"
        animate="visible"
        className="relative flex items-center justify-center gap-x-4"
        aria-label="How sign-in works"
      >
        {TRUST_POINTS.map(({ icon: Icon, label }) => (
          <motion.li
            key={label}
            variants={listItem}
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-muted-foreground"
          >
            <Icon aria-hidden
              className="size-3 text-glow" />
            {label}
          </motion.li>
        ))}
      </motion.ul>

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.08 }}
        className="relative flex w-full max-w-xs flex-col items-center gap-1.5"
      >
        <Button
          onClick={handleSignIn}
          disabled={loading}
          aria-busy={loading}
          size="lg"
          className="group h-11 w-full justify-between px-4 text-[15px] shadow-glow disabled:opacity-100"
        >
          <span className="inline-flex items-center gap-2.5">
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <img
                src={pd2Logo}
                alt=""
                draggable={false}
                className="size-5 rounded-full ring-1 ring-primary-foreground/30"
              />
            )}
            {loading ? 'Opening browser…' : 'Sign in with PD2'}
          </span>
          {!loading && (
            <ArrowRight className="size-4 opacity-60 transition-[opacity,transform] duration-(--dur-fast) group-hover:translate-x-0.5 group-hover:opacity-100" />
          )}
        </Button>

        <p className="h-4 text-[11px] text-muted-foreground"
          aria-live="polite">
          {loading
            ? 'Finish signing in in your browser, then come back here.'
            : 'Opens projectdiablo2.com in your browser.'}
        </p>

        {/* Closing the browser tab leaves the flow polling for up to 10 minutes: cancel to retry */}
        <Button
          variant="ghost"
          size="sm"
          onClick={flowActive ? cancelOAuthFlow : handleLater}
          className="text-muted-foreground hover:text-foreground"
        >
          {flowActive ? 'Cancel' : 'Later'}
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
