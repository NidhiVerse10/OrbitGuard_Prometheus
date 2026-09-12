import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    cesium(),
  ],
})

