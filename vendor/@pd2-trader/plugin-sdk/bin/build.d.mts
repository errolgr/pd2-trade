import type { ManifestResult, PluginManifest } from '../src/manifest';

export declare const SOURCE_MANIFEST: 'pd2-plugin.json';
export declare class PluginBuildError extends Error {}
export declare function loadManifestModule(): Promise<{ parseManifest(value: unknown): ManifestResult }>;
export declare function buildPanelHtml(htmlPath: string, panel: string): Promise<string>;
export declare function buildPlugin(root: string): Promise<{ manifest: PluginManifest; files: Map<string, string> }>;
export declare function writeOutput(dir: string, files: Map<string, string>): Promise<void>;
export declare function display(path: string): string;
