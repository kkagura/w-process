import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@w-process/flow-core': fileURLToPath(new URL('../../packages/flow-core/src/index.ts', import.meta.url)),
    },
  },
})
