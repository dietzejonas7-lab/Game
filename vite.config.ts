import { defineConfig } from 'vite';

// base: './' sorgt dafür, dass das Spiel überall läuft:
// in der Android-App (Capacitor), auf GitHub Pages und lokal.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
});
