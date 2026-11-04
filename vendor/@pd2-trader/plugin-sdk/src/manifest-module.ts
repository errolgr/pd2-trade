/**
 * `@pd2-trader/plugin-sdk/manifest`: the manifest schema and the lists and version helpers it validates against,
 * without the worker, panel or React code. Bundlers load this source; CommonJS consumers (the marketplace server)
 * load `dist/manifest.cjs`, built by `scripts/build-manifest.mjs` with zod bundled in.
 */
export * from './manifest';
export { PERMISSIONS, PERMISSION_INFO, type Permission, type PermissionInfo } from './permissions';
export { SLOT_IDS, SLOT_PERMISSIONS, type CallableSlotId, type SlotId } from './slots';
export { compareVersions, isValidRange, isValidVersion, parseVersion, satisfies, type SemVer } from './semver';
export { SDK_MAJOR, SDK_VERSION } from './version';
