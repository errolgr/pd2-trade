import React, { useMemo } from 'react';
import {
  BookOpen,
  Camera,
  Hammer,
  Handshake,
  History,
  ListChecks,
  LogIn,
  LogOut,
  MessagesSquare,
  RefreshCw,
  Settings,
  Store,
  Wallet,
} from 'lucide-react';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useSignIn } from '@/hooks/useSignIn';
import { useNetWorth } from '@/hooks/useNetWorth';
import { getBadgeCount } from '@/overlay';
import { openOffers } from '@/pages/chat/chat-feed';
import { formatHotkey } from '../lib/hotkey';
import { bestTier } from '../lib/match';
import type { PaletteItem, PaletteRunContext, PaletteSource } from '../lib/types';
import { t } from '@/i18n';

interface ActionDef {
  key: string;
  labelKey: string;
  icon: React.ReactNode;
  /** English search words besides the (translated) label. */
  keywords: string[];
  hotkey?: [keyof ISettings, keyof ISettings];
  /** Only listed when this holds. */
  when?: (signedIn: boolean) => boolean;
  run(ctx: PaletteRunContext): void | Promise<void>;
}

const ICON = 'h-4 w-4';

/** The palette's panel and app actions (the hotkey handlers' equivalents, see AppController). */
export const useActionsSource: PaletteSource = ({ query, scope, limit, refs }) => {
  const { settings } = useOptions();
  const { logout } = usePd2Website();
  const { openSignIn } = useSignIn();
  const { takeSnapshot } = useNetWorth();
  const signedIn = !!settings.pd2Token;

  const defs = useMemo<ActionDef[]>(
    () => [
      {
        key: 'market',
        labelKey: 'palette:actions.market',
        icon: <Store className={ICON} />,
        keywords: ['trade', 'buy', 'search', 'listings'],
        hotkey: ['hotkeyModifierMarket', 'hotkeyKeyMarket'],
        run: (ctx) => ctx.openPanel('market'),
      },
      {
        key: 'chat',
        labelKey: 'palette:actions.chat',
        icon: <MessagesSquare className={ICON} />,
        keywords: ['messages', 'whispers', 'inbox'],
        hotkey: ['hotkeyModifierChat', 'hotkeyKeyChat'],
        run: (ctx) =>
          ctx.openPanel('chat', getBadgeCount('chatUnread') > 0 ? { newestUnread: true } : undefined, { focus: true }),
      },
      {
        key: 'offers',
        labelKey: 'palette:actions.offers',
        icon: <Handshake className={ICON} />,
        keywords: ['offers', 'deals', 'selling'],
        hotkey: ['hotkeyModifierOffers', 'hotkeyKeyOffers'],
        run: (ctx) => openOffers((payload) => ctx.openPanel('chat', payload, { focus: true })),
      },
      {
        key: 'builds',
        labelKey: 'palette:actions.builds',
        icon: <Hammer className={ICON} />,
        keywords: ['meta', 'characters', 'ladder', 'armory'],
        hotkey: ['hotkeyModifierBuilds', 'hotkeyKeyBuilds'],
        run: (ctx) => ctx.openPanel('builds'),
      },
      {
        key: 'notifications',
        labelKey: 'palette:actions.notifications',
        icon: <History className={ICON} />,
        keywords: ['notifications', 'missed', 'log', 'history', 'alerts'],
        hotkey: ['hotkeyModifierNotifications', 'hotkeyKeyNotifications'],
        run: (ctx) => ctx.openPanel('notifications'),
      },
      {
        key: 'stashValue',
        labelKey: 'palette:actions.stashValue',
        icon: <Wallet className={ICON} />,
        keywords: ['net worth', 'currency', 'wealth', 'stash'],
        hotkey: ['hotkeyModifierCurrencyValuation', 'hotkeyKeyCurrencyValuation'],
        run: (ctx) => ctx.openPanel('currency'),
      },
      {
        key: 'snapshot',
        labelKey: 'palette:actions.snapshot',
        icon: <Camera className={ICON} />,
        keywords: ['net worth', 'snapshot', 'history'],
        hotkey: ['hotkeyModifierSnapshot', 'hotkeyKeySnapshot'],
        when: (signedIn) => signedIn,
        run: async () => {
          await takeSnapshot('manual');
        },
      },
      {
        key: 'myListings',
        labelKey: 'palette:actions.myListings',
        icon: <ListChecks className={ICON} />,
        keywords: ['quick list', 'listings', 'sell', 'manage'],
        when: (signedIn) => signedIn,
        run: (ctx) => ctx.openPanel('quickList', undefined, { placement: 'gameCenter' }),
      },
      {
        key: 'settings',
        labelKey: 'palette:actions.settings',
        icon: <Settings className={ICON} />,
        keywords: ['options', 'preferences', 'config'],
        hotkey: ['hotkeyModifierSettings', 'hotkeyKeySettings'],
        run: (ctx) => ctx.openPanel('settings'),
      },
      {
        key: 'changelog',
        labelKey: 'palette:actions.changelog',
        icon: <BookOpen className={ICON} />,
        keywords: ['changelog', 'release notes', 'version'],
        run: (ctx) => ctx.openPanel('changeLog'),
      },
      {
        key: 'checkUpdates',
        labelKey: 'palette:actions.checkUpdates',
        icon: <RefreshCw className={ICON} />,
        keywords: ['update', 'version', 'about'],
        run: (ctx) => ctx.openPanel('settings', { section: 'About' }),
      },
      {
        key: 'signIn',
        labelKey: 'palette:actions.signIn',
        icon: <LogIn className={ICON} />,
        keywords: ['login', 'log in', 'account'],
        when: (signedIn) => !signedIn,
        run: () => openSignIn(),
      },
      {
        key: 'signOut',
        labelKey: 'palette:actions.signOut',
        icon: <LogOut className={ICON} />,
        keywords: ['logout', 'log out', 'account'],
        when: (signedIn) => signedIn,
        run: async () => {
          await logout();
        },
      },
    ],
    [logout, openSignIn, takeSnapshot],
  );

  return useMemo(() => {
    const toItem = (def: ActionDef): PaletteItem => {
      const label = t(def.labelKey);
      const hotkey = def.hotkey && formatHotkey(settings[def.hotkey[0]], settings[def.hotkey[1]]);
      return {
        ref: { id: `actions:${def.key}`, group: 'actions', title: label },
        icon: def.icon,
        trailing: hotkey ? <kbd className="font-sans text-[11px] text-muted-foreground">{hotkey}</kbd> : undefined,
        primary: { id: 'run', label, run: def.run },
      };
    };
    const available = defs.filter((def) => !def.when || def.when(signedIn));
    if (limit === 0) return { items: [], loading: false };

    if (!query) {
      const byKey = new Map(available.map((def) => [`actions:${def.key}`, def]));
      const items = refs.flatMap((ref) => {
        const def = byKey.get(ref.id);
        return def ? [toItem(def)] : [];
      });
      // Tab-scoped to actions with nothing typed: every action
      return { items: scope ? available.map(toItem) : items, loading: false };
    }

    const ranked = available
      .map((def, order) => ({ def, order, tier: bestTier([t(def.labelKey), ...def.keywords], query) }))
      .filter((r) => r.tier > 0)
      .sort((a, b) => b.tier - a.tier || a.order - b.order)
      .slice(0, limit);
    return { items: ranked.map((r) => toItem(r.def)), loading: false };
  }, [defs, limit, query, refs, scope, settings, signedIn]);
};
