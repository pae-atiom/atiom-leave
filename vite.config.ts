import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    // SPA mode: the entire mock data layer is localStorage-backed and auth runs
    // in beforeLoad, so we render guarded content on the client only.
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
  ],
})

export default config
