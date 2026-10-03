// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@astrojs/netlify'

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
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
  adapter: netlify({
    // Dev-only: this project has no netlify/edge-functions and no edge
    // middleware, so skip the Deno edge-functions emulator in `astro dev`
    // (its spawn fails on Deno >=2.9: `deno eval --allow-scripts` is
    // rejected). Production builds/deploys are unaffected.
    devFeatures: {
      environmentVariables: false,
      images: true,
      edgeFunctions: false,
    },
  }),
})
