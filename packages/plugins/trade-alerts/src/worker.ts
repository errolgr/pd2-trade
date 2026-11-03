import { sdk, ui } from '@pd2-trader/plugin-sdk';
import { matchMessage, parseSettings, type AlertSettings } from './match';

const MATCHES_KEY = 'matches';
/** Remembered match ids (dedupes notifications across reloads); oldest dropped first. */
const MAX_MATCHES = 200;

let settings: AlertSettings = parseSettings({});
let matches: string[] = [];
const matched = new Set<string>();

// Storage writes go one at a time so a slow write never lands after a newer one.
let saving: Promise<void> = Promise.resolve();
const save = () => {
  const snapshot = matches.slice();
  saving = saving.then(() => sdk.storage.set(MATCHES_KEY, snapshot)).catch((error: unknown) => {
    sdk.log('Could not save matches:', error instanceof Error ? error.message : String(error));
  });
};

sdk.settings.onChange((values) => (settings = parseSettings(values)));
void sdk.settings.get().then((values) => (settings = parseSettings(values)));

void sdk.storage
  .get<string[]>(MATCHES_KEY)
  .then((stored) => {
    if (!Array.isArray(stored)) return;
    matches = [...stored, ...matches].slice(-MAX_MATCHES);
    matches.forEach((id) => matched.add(id));
  })
  .catch(() => {});

sdk.events.on('chat.message', (message) => {
  const keyword = matchMessage(message, settings);
  if (!keyword || matched.has(message.id)) return;
  matched.add(message.id);
  matches.push(message.id);
  while (matches.length > MAX_MATCHES) matched.delete(matches.shift()!);
  save();
  if (!settings.notify) return;
  // Rate-limited by the host (a few per minute); a rejected toast is not an error worth surfacing.
  sdk
    .notify({
      title: `Trade alert: ${keyword}`,
      body: `${message.sender}: ${message.text}`.slice(0, 300),
      tone: 'success',
    })
    .catch(() => {});
});

sdk.slots.register('chat.decorate', (message) =>
  matchMessage(message, settings) ? { tags: [ui.badge('Match', 'success')], highlight: 'success' } : null,
);

sdk.commands.register('clear', async () => {
  matches = [];
  matched.clear();
  await saving;
  await sdk.storage.remove(MATCHES_KEY);
});
