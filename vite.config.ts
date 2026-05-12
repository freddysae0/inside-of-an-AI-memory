import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl({ compress: false, watch: true })],
  server: { port: 5173, host: true },
  build: { target: 'es2022', sourcemap: true },
});
