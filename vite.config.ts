/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import dataset from './public/data/geo-events.json';
import type { GeoData } from './src/types/events';
import { archiveStats } from './src/landing/archiveStats';
import { landingStrings } from './src/landing/strings';
import { fillPlaceholders, fillStrings } from './src/landing/fillStrings';

// GitHub Pages serves this project from /historycastmap/.
// All runtime data fetches must go through import.meta.env.BASE_URL.

// Resolved off import.meta.url rather than __dirname so the config stays typeable
// without pulling in @types/node.
const here = (file: string) => new URL(file, import.meta.url).pathname;

/**
 * The landing page's numbers and Serbian text, settled at build time (docs/plans/2026-10-11-landing.md).
 * `virtual:landing-stats` gives the page script the archive's numbers; index.html gets every
 * `data-i` element filled with its Serbian string, so the page reads without JavaScript. Both
 * come from the dataset through the app's own episode model, so the page cannot drift from the
 * map. A key with no string fails the build rather than shipping an empty heading.
 */
function landingPage(): Plugin {
  const stats = archiveStats(dataset as unknown as GeoData);
  const id = 'virtual:landing-stats';
  return {
    name: 'hcm-landing',
    resolveId: (source) => (source === id ? '\0' + id : undefined),
    load: (source) => (source === '\0' + id ? `export default ${JSON.stringify(stats)};` : undefined),
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.filename.endsWith('index.html')) return html;
        const sr = landingStrings(stats).sr;
        const elements = fillStrings(html, sr);
        const attributes = fillPlaceholders(elements.html, sr);
        const missing = [...elements.missing, ...attributes.missing];
        if (missing.length) throw new Error(`index.html: no string for ${missing.join(', ')}`);
        return attributes.html;
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), landingPage()],
  base: '/historycastmap/',
  test: {
    // Vitest blanks CSS imports by default, `?raw` included. styles/theme.test.ts reads the
    // theme's tokens as text to check their contrast, so that one stylesheet is processed.
    css: { include: [/theme\.css/] },
  },
  build: {
    rollupOptions: {
      // Two pages, no router: index.html is the landing page, app.html mounts the explorer.
      // Keeps the SPA free of a routing dependency (CLAUDE.md: no heavy deps without reason).
      input: {
        main: here('./index.html'),
        app: here('./app.html'),
      },
    },
  },
});
