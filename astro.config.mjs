// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import tina from '@tinacms/astro/integration'
import { tinaAdminDevRedirect } from '@tinacms/astro/vite'

// Do not copy build credentials into generated Worker preview artifacts.
process.env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = 'false'

export default defineConfig({
  integrations: [tina()],
  vite: {
    plugins: [
      tailwindcss(), tinaAdminDevRedirect(),
      {
        name: 'tina-runtime-token',
        enforce: 'pre',
        transform(code, id) {
          if (id.replaceAll('\\', '/').endsWith('/tina/__generated__/client.ts')) {
            // Keep the CLI's literal secret out of Worker bundles; use the environment.
            const replaced = code.replace(/token:\s*"(?:\\.|[^"\\])*"/, 'token: process.env.TINA_TOKEN')
            if (replaced === code) throw new Error('Unexpected Tina client token format')
            return { code: replaced, map: null }
          }
        },
      },
    ],
    build: {
      cssMinify: true,
      // lightningcss drops -webkit-backdrop-filter for baseline targets;
      // keep Safari 17 in range so the glass keeps its WebKit prefix.
      // Must be an array: Vite's convertTargets() does not split commas.
      cssTarget: ['chrome100', 'firefox100', 'safari17'],
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  server: {
    port: 4321,
  },
  output: 'static',
  session: false,
  adapter: cloudflare({ imageService: 'passthrough', prerenderEnvironment: 'node' }),
})
