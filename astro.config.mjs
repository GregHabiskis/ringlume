// @ts-check
import { defineConfig } from 'astro/config'
import { storyblok } from '@storyblok/astro'
import { loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const env = loadEnv("", process.cwd(), 'STORYBLOK')

export default defineConfig({
  integrations: [
    storyblok({
      accessToken: env.STORYBLOK_DELIVERY_API_TOKEN,
      apiOptions: {
        region: 'us',
      },
      components: {
        page: 'storyblok/Page',
        teaser: 'storyblok/Teaser',
      }
    })
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 4321,
  },
})
