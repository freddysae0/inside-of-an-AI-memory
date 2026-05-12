import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl({ compress: false, watch: true })],
  server: { port: 5173, host: true },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          postprocessing: ['postprocessing'],
          motion: ['gsap', 'lenis'],
        },
      },
    },
  },
});
