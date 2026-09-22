import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The full catalog is needed immediately on first visit, but remains a separate
// cacheable chunk. Let the HTML parser fetch it alongside the app, rather than
// waiting for React's catalog-loading effect to discover the dynamic import.
function preloadCatalog(): Plugin {
  return {
    name: 'streamflicker-preload-catalog',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const catalog = Object.values(context.bundle ?? {}).find((output) =>
          output.type === 'chunk'
          && output.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/data/generatedMovies.ts'));
        if (!catalog) throw new Error('The browser catalog chunk is missing from the production build');
        return [{
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${catalog.fileName}` },
          injectTo: 'head',
        }];
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadCatalog()],
})
