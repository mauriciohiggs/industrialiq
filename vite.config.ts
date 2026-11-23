import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'include-dependency-licenses',
      generateBundle() {
        const packages = ['react', 'react-dom', 'scheduler', 'lucide-react', '@fontsource-variable/dm-sans', '@fontsource-variable/manrope']
        this.emitFile({
          type: 'asset',
          fileName: 'third-party-licenses.txt',
          source: packages.map((name) => `${name}\n\n${readFileSync(new URL(`./node_modules/${name}/LICENSE`, import.meta.url), 'utf8')}`).join('\n\n--------------------\n\n'),
        })
      },
    },
  ],
})
