import type { PluginManifest } from '../src/manifest';

export interface PluginBundle {
  format: 'pd2-plugin-bundle@1';
  manifest: PluginManifest;
  files: Record<string, string>;
}

export declare const BUNDLE_FORMAT: 'pd2-plugin-bundle@1';
export declare const DEFAULT_API: string;
export declare const CHANGELOG_FILE: 'CHANGELOG.md';
export declare const CHANGELOG_MAX_CHARS: number;
export declare class PublishError extends Error {}
export declare function toBundle(manifest: PluginManifest, files: Map<string, string>): PluginBundle;
export declare function changelogSection(markdown: string, version: string): string | null;
export declare function releaseNotes(
  root: string,
  version: string,
  options: { notes?: string; changelog?: string },
): Promise<string | null>;
export declare function publishKey(flag: string | undefined, env?: Record<string, string | undefined>): string;
export declare function upload(options: {
  api: string;
  key: string;
  bundle: PluginBundle;
  changelog: string | null;
  fetchImpl?: typeof fetch;
}): Promise<{ version: string; status: string; checks?: { errors: string[]; warnings: string[] } }>;
