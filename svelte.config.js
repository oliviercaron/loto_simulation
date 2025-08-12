// svelte.config.js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV === 'development';
// Must match your repo name
const BASE_PATH = process.env.BASE_PATH ?? '/loto_simulation';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Enable TS/PostCSS inside .svelte
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      // SPA fallback so deep links work on GH Pages
      fallback: '404.html'
    }),
    paths: {
      // Base path only in production (GH Pages)
      base: dev ? '' : BASE_PATH
    }
  }
};

export default config;
