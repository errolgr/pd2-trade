import { z } from 'zod';

/**
 * Fills `{token}` placeholders in a user-editable message template (Options → Chat). Tokens listed in `vars`
 * are replaced everywhere they appear, a missing value with ''; tokens not in `vars` stay as typed.
 */
export function fillTemplate(
  template: string,
  vars: Readonly<Record<string, string | number | null | undefined>>,
): string {
  return template.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name] ?? '') : token,
  );
}

/** A user-defined chat message template, offered by the composer's "/" menu (Settings → Chat). */
export interface ChatTemplate {
  id: string;
  name: string;
  text: string;
}

export const CHAT_TEMPLATE_NAME_MAX = 40;
export const CHAT_TEMPLATE_TEXT_MAX = 500;

/** Name and text of a chat template as the settings editor validates them. */
export const chatTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the template a name')
    .max(CHAT_TEMPLATE_NAME_MAX, `Name: at most ${CHAT_TEMPLATE_NAME_MAX} characters`),
  text: z
    .string()
    .trim()
    .min(1, 'Write the message')
    .max(CHAT_TEMPLATE_TEXT_MAX, `Message: at most ${CHAT_TEMPLATE_TEXT_MAX} characters`),
});

/** The tokens a chat template can use, filled from the open conversation. */
export const CHAT_TEMPLATE_TOKENS = [
  { token: '{accountName}', description: 'Their account name' },
  { token: '{characterName}', description: "Their character's name" },
  { token: '{itemName}', description: 'The item last linked or whispered about' },
  { token: '{price}', description: 'Its price' },
] as const;

/** The templates new installs (and settings files from before custom templates) start with. */
export const DEFAULT_CHAT_TEMPLATES: ChatTemplate[] = [
  { id: 'default-still-available', name: 'Still available?', text: 'Hi, is your {itemName} still available?' },
  { id: 'default-price-check', name: 'Price check', text: 'Would you take {price} for {itemName}?' },
  { id: 'default-inv-me', name: 'Inv me', text: 'Sure, inv me when you are ready.' },
];

/** Guards entries read from the settings file (hand-edited or corrupt files). */
export function isChatTemplate(value: unknown): value is ChatTemplate {
  if (typeof value !== 'object' || value === null) return false;
  const { id, name, text } = value as Record<string, unknown>;
  return typeof id === 'string' && typeof name === 'string' && typeof text === 'string';
}
