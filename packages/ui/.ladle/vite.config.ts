import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { writeTailwindCss } from '../scripts/build-css';

/**
 * Ladle's Vite config: Tailwind 4 (scanning packages/ui/src via `@source` in catalog.css) on freshly generated
 * tokens. Serves the overlay's public dir so RuneIcon finds its default art at /runes/<Name>_Rune.png.
 */
export default defineConfig({
  publicDir: fileURLToPath(new URL('../../../public', import.meta.url)),
  plugins: [
    {
      name: 'pd2-ui-tokens-css',
      buildStart() {
        writeTailwindCss();
      },
    },
    tailwindcss(),
  ],
});
