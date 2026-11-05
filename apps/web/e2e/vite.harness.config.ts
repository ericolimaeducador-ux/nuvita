import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Config do harness de teste (porta própria). NÃO é usada pelo build de produção.
const web = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('./harness', import.meta.url)),
  plugins: [react()],
  resolve: { alias: { '@': web('src') } },
  css: { postcss: web('.') },
  server: { port: 5199, strictPort: true, fs: { allow: [web('..')] } },
});
