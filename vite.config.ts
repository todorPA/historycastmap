import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project from /historycastmap/.
// All runtime data fetches must go through import.meta.env.BASE_URL.
export default defineConfig({
  plugins: [react()],
  base: '/historycastmap/',
});
