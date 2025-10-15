import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Build switch: normal Kit build vs single-file embed bundle
const isEmbed = process.env.EMBED === 'true';

export default defineConfig({
  plugins: isEmbed ? [svelte()] : [sveltekit()],
  resolve: isEmbed
    ? {
        // Keep $lib usable when building outside Kit
        alias: {
          $lib: '/src/lib'
        }
      }
    : undefined,
  build: isEmbed
    ? {
        lib: {
          entry: 'src/embed.js',
          name: 'SvelteEmbed',            // window.SvelteEmbed
          formats: ['iife'],
          fileName: () => 'svelte-embed.iife.js'
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true   // single JS file
          }
        },
        target: 'es2018',
        emptyOutDir: false                // don’t wipe your Kit build output
      }
    : undefined
});
