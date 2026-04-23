import React, { useState } from 'react';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { useOAuth } from '@/hooks/useOAuth';
import { OptionsProvider } from '@/hooks/useOptions';
import pd2Logo from '@/assets/pd2_logo.png';
import { X } from 'lucide-react';

function SignInContent() {
  const { startOAuthFlow } = useOAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await startOAuthFlow();
      getCurrentWebviewWindow().close();
    } finally {
      setLoading(false);
    }
  };

  const handleLater = () => {
    getCurrentWebviewWindow().close();
  };

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
