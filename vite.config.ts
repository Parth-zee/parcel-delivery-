import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:phone` runs Vite in "phone" mode: it listens on your Wi-Fi
// address and serves a self-signed HTTPS certificate, because phone browsers
// only allow GPS access on HTTPS pages (or on localhost).
// `base: './'` makes every asset path relative, so the same build works at a
// domain root (Netlify, Vercel) and in a sub-folder (GitHub Pages).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'phone' ? [basicSsl()] : [])],
  server: {
    host: mode === 'phone' ? true : undefined,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
}));
