// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: true,
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  server: {
    port: 4321,
  },
})
