import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { readFileSync } from 'fs';
// @ts-expect-error - @tailwindcss/vite may not have complete TypeScript definitions
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const { version } = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string };

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the 'VITE_' prefix.
  // loadEnv automatically loads: .env, .env.local, .env.[mode], .env.[mode].local
  // Mode-specific files override base .env values
  const env = loadEnv(mode, process.cwd(), '');

  // Also check process.env as fallback (for cases where .env is loaded by system)
  // This ensures .env works even if loadEnv doesn't pick it up for some reason
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN;
  const host = process.env.TAURI_DEV_HOST;

  return {
    define: {
      // Faro app version (src/lib/faro.ts)
      __APP_VERSION__: JSON.stringify(version),
      // Feature flag (src/lib/feature-flags.ts): VITE_LEADERBOARD_LIVE=true in the env or a .env file
      __LEADERBOARD_LIVE__: JSON.stringify((env.VITE_LEADERBOARD_LIVE || process.env.VITE_LEADERBOARD_LIVE) === 'true'),
    },
    plugins: [
      tailwindcss(),
      react(),
      // Only enable Sentry plugin when auth token is available
      // Vite automatically sets NODE_ENV=production during vite build
      ...(sentryAuthToken
        ? [
            sentryVitePlugin({
              authToken: sentryAuthToken,
              org: 'pulsewave',
              project: 'dmg-meter-frontend',
              sourcemaps: {
                // Upload source maps for all assets in dist
                // The plugin automatically injects Debug IDs into built files
                // and uploads source maps with source content
                assets: './dist/**',
                // Files to delete after upload (empty array means don't delete anything)
                filesToDeleteAfterUpload: [],
                // Rewrite source paths to be relative to project root
                // This helps Sentry match source files correctly
                rewriteSources: (source) => {
                  // Remove any protocol prefixes and normalize paths
                  return source
                    .replace(/^webpack:\/\//, '')
                    .replace(/^\/@fs\//, '')
                    .replace(/^\/@id\//, '')
                    .replace(/^\/@vite\/client/, '')
                    .replace(/^\/@vite\/env/, '');
                },
              },
              // Set the release version for better tracking
              release: {
                name: process.env.npm_package_version || 'unknown',
              },
              // Enable error handling to see if uploads fail
              errorHandler: (err) => {
                console.warn('Sentry source map upload warning:', err);
              },
              // Enable debug mode to see what's being uploaded
              debug: process.env.NODE_ENV !== 'production',
            }),
          ]
        : []),
    ],
    build: {
      // Source map generation must be turned on for Sentry
      // Vite/Rollup includes sourcesContent by default in source maps
      // This allows Sentry to unminify code without needing separate source file uploads
      sourcemap: true,
      rollupOptions: {
        output: {
          sourcemapIgnoreList: false,
          // Ensure source maps include source content for Sentry
          sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
            // Return the relative path to help Sentry match sources
            return relativeSourcePath;
          },
        },
      },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        usePolling: true,
        // 3. tell vite to ignore watching `src-tauri`
        ignored: ['**/src-tauri/**'],
      },
      // Proxy API requests to bypass CORS in browser
      proxy: {
        '/api': {
          target: 'https://api.projectdiablo2.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: true,
        },
      },
    },
  };
});
