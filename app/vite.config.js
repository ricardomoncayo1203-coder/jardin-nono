import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' — rutas relativas para que funcione en GitHub Pages (/jardin-nono/)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
