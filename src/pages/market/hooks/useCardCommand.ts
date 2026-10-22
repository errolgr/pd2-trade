import { useCallback, useRef, useState } from 'react';
import type { CardCommand } from '../components/ResultCards';

export interface CardCommands {
  /** The latest hotkey command, until a card takes it. */
  command: CardCommand | null;
  issue: (id: string, action: CardCommand['action']) => void;
  /**
   * Claims a command for running: true exactly once per nonce. Cards remount (virtual scrolling, result sets,
   * tab and view switches), so the page — not the card — remembers what already ran; a remounted card can't
   * replay an F (un-favorite), W or O.
   */
  take: (nonce: number) => boolean;
}

/** Hotkeys (O offer, W whisper, F favorite) for the selected card. */
export function useCardCommand(): CardCommands {
  const [command, setCommand] = useState<CardCommand | null>(null);
  const seq = useRef(0);
  const handled = useRef(0);

  const issue = useCallback((id: string, action: CardCommand['action']) => {
    seq.current += 1;
    setCommand({ id, action, nonce: seq.current });
  }, []);

  const take = useCallback((nonce: number) => {
    // Nonces only grow, so the highest handled one is enough to reject every replay.
    if (nonce <= handled.current) return false;
    handled.current = nonce;
    setCommand((c) => (c?.nonce === nonce ? null : c));
    return true;
  }, []);

  return { command, issue, take };
}
