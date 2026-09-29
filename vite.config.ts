import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project from /historycastmap/.
// All runtime data fetches must go through import.meta.env.BASE_URL.

// Resolved off import.meta.url rather than __dirname so the config stays typeable
// without pulling in @types/node.
const here = (file: string) => new URL(file, import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  base: '/historycastmap/',
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
