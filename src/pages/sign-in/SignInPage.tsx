import React, { useState } from 'react';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { useOAuth } from '@/hooks/useOAuth';
import { useOptions, OptionsProvider } from '@/hooks/useOptions';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { ScrollArea } from '@/components/ui/scroll-area';
import pd2Logo from '@/assets/pd2_logo.png';
import { X, Check } from 'lucide-react';

function SignInContent() {
  const { startOAuthFlow } = useOAuth();
  const { settings, updateSettings } = useOptions();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<string[] | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const token = await startOAuthFlow();
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

      if (response.ok) {
        const data = await response.json();
        const userAccounts = data?.user?.game?.accounts ?? [];
        console.log('[SignIn] Accounts found:', userAccounts);

        if (userAccounts.length <= 1) {
          // Single or no accounts — auto-select and close
          if (userAccounts.length === 1) {
            await updateSettings({ account: userAccounts[0] });
          }
          getCurrentWebviewWindow().close();
        } else {
          // Multiple accounts — show selector and bring window to front
          setAccounts(userAccounts);
          setLoading(false);
          getCurrentWebviewWindow()
            .setFocus()
            .catch(() => {});
        }
      } else {
        // Auth check failed but tokens are stored — just close
        getCurrentWebviewWindow().close();
      }
    } catch (err) {
      console.error('[SignIn] Error during sign-in flow:', err);
      setLoading(false);
    }
  };

  const handleSelectAccount = async (account: string) => {
    setSelectedAccount(account);
    await updateSettings({ account });
    getCurrentWebviewWindow().close();
  };

  const handleLater = () => {
    getCurrentWebviewWindow().close();
  };

  // Account selection view
  if (accounts && accounts.length > 1) {
    return (
      <div
        className="relative flex flex-col items-center justify-center h-screen bg-background text-foreground select-none gap-4 px-8 py-6 rounded-lg border border-border shadow-2xl overflow-hidden"
        data-tauri-drag-region
      >
        <button
          onClick={handleLater}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-2 text-center flex-shrink-0">
          <h1 className="text-xl font-semibold">Sign in to PD2 Trader</h1>
          <p className="text-sm text-muted-foreground">Multiple accounts found. Select which one to use.</p>
        </div>

        <ScrollArea className="w-full max-w-xs min-h-0 flex-1">
          <div className="flex flex-col gap-2">
            {accounts.map((account) => (
              <button
                key={account}
                onClick={() => handleSelectAccount(account)}
                disabled={selectedAccount !== null}
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-md border border-neutral-600 hover:border-amber-500/70 hover:bg-[#1a1a2e] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{account}</span>
                {selectedAccount === account && <Check className="w-4 h-4 text-green-500" />}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Sign in view
  return (
    <div
      className="relative flex flex-col items-center justify-center h-screen bg-background text-foreground select-none gap-6 px-8 rounded-lg border border-border shadow-2xl"
      data-tauri-drag-region
    >
      <button
        onClick={handleLater}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-semibold">Sign in to PD2 Trader</h1>
        <p className="text-sm text-muted-foreground">
          Connect your Project Diablo 2 account to access trading features.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md bg-[#1a1a2e] hover:bg-[#16213e] border border-amber-500/40 hover:border-amber-500/70 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img src={pd2Logo}
            alt=""
            className="w-5 h-5 rounded-full" />
          {loading ? 'Opening browser...' : 'Sign in with PD2'}
        </button>

        <button
          onClick={handleLater}
          disabled={loading}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <OptionsProvider>
      <SignInContent />
    </OptionsProvider>
  );
}
