/**
 * Ladle catalog for @pd2-trader/ui (`npm run catalog`, `npm run catalog:build`).
 * Theme and window transparency come from the catalog toolbar in `components.tsx`, so Ladle's own
 * light/dark addon is off (it would fight the DS theme classes on <html>).
 * @type {import('@ladle/react').UserConfig}
 */
export default {
  stories: 'src/**/*.stories.tsx',
  viteConfig: '.ladle/vite.config.ts',
  outDir: 'build',
  port: 61010,
  previewPort: 61011,
  appendToHead:
    '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />',
  addons: {
    theme: { enabled: false },
    rtl: { enabled: false },
    a11y: { enabled: true },
    msw: { enabled: false },
  },
};
