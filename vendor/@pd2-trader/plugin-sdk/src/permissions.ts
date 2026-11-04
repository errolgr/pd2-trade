/**
 * Capability permissions (PRD §6.5). Network hosts are not listed here: they live in `manifest.network` and are
 * shown to the user as `network:<host>` (prompted, manual review for new hosts).
 *
 * Never grantable, by construction (no permission, no broker method): the PD2 JWT, `press_key` / game input,
 * the filesystem, clipboard write, arbitrary Tauri commands.
 */
export const PERMISSIONS = [
  'prices:read',
  'items:read',
  'chat:read',
  'stash:read',
  'account:profile',
  'storage:local',
  'notifications',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface PermissionInfo {
  /** silent: granted at install without a prompt line of its own; prompt: listed for explicit consent. */
  consent: 'silent' | 'prompt';
  /** Marketplace review: auto checks only, or manual approval. */
  review: 'auto' | 'manual';
}

export const PERMISSION_INFO: Record<Permission, PermissionInfo> = {
  'prices:read': { consent: 'silent', review: 'auto' },
  'items:read': { consent: 'silent', review: 'auto' },
  'chat:read': { consent: 'prompt', review: 'auto' },
  'stash:read': { consent: 'prompt', review: 'manual' },
  'account:profile': { consent: 'prompt', review: 'manual' },
  'storage:local': { consent: 'silent', review: 'auto' },
  notifications: { consent: 'silent', review: 'auto' },
};

/** Per-plugin local KV quota (storage:local), bytes of UTF-8 JSON across all keys. */
export const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024;
