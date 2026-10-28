import { t } from '@/i18n';
import { CustomToastPayload, ToastActionType } from '@/common/types/Events';

/** Where users download a build to install themselves (deb/rpm via their package manager, or a new AppImage). */
export const RELEASE_PAGE_URL = 'https://github.com/errolgr/pd2-trade/releases/latest';

// tauri-plugin-updater errors for Linux installs it can't replace in place; retrying never helps:
// - "Permission denied (os error 13) at path /usr/bin/tauri_current_app…": a system package install (e.g. rpm, or a
//   deb dpkg doesn't track) takes the AppImage path and can't write to /usr/bin. The OS text is localized, the errno isn't.
// - "invalid updater binary format": a detected deb install, but latest.json only ships the AppImage for Linux.
const MANUAL_UPDATE_ERROR = /\(os error 13\)|invalid updater binary format/i;

export function requiresManualUpdate(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return MANUAL_UPDATE_ERROR.test(message);
}

// Set once self-update failed for good this session, so update prompts link to the release page instead
let manualUpdateRequired = false;

export function markManualUpdateRequired(): void {
  manualUpdateRequired = true;
}

export function isManualUpdateRequired(): boolean {
  return manualUpdateRequired;
}

export function resetManualUpdateRequired(): void {
  manualUpdateRequired = false;
}

export function manualUpdateDescription(): string {
  return t('system:updates.manualDescription');
}

export function manualUpdateToast(version: string): CustomToastPayload {
  return {
    title: t('system:updates.manualTitle', { version }),
    description: manualUpdateDescription(),
    // Stays up until dismissed: the user has to act on it outside the app
    duration: Infinity,
    action: { label: t('system:updates.openReleasePage'), type: ToastActionType.OPEN_RELEASE_PAGE },
  };
}
