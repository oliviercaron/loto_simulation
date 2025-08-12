// svelte.config.js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV === 'development';
const BASE_PATH = process.env.BASE_PATH ?? '/loto-gagnants';

const config = {
  preprocess: vitePreprocess(), // keep this to enable TypeScript in .svelte

  kit: {
    adapter: adapter({
      // SPA fallback so deep links work on GitHub Pages
      fallback: '404.html'
    }),
    paths: {
      base: dev ? '' : BASE_PATH
    }
  }
};

export default config;
