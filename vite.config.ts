import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/EvaluadorFB/' : '/',
  server: {
    port: 5173,
    host: true, // Enables local network access (e.g., test on tablet / mobile on the same Wi-Fi)
  },
});
