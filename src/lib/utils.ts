import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { warn, debug, trace, info, error } from '@tauri-apps/plugin-log';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


function forwardConsole(
  fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
  logger: (message: string) => Promise<void>
) {
  const original = console[fnName];
  console[fnName] = (message) => {
    original(message);
    logger(message);
  };
}

forwardConsole('log', trace);
forwardConsole('debug', debug);
forwardConsole('info', info);
forwardConsole('warn', warn);
forwardConsole('error', error);