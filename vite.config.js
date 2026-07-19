import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // servido em https://pedrodetsi.github.io/cordilheira/
  base: '/cordilheira/',
  plugins: [react()],
  assetsInclude: ['**/*.woff'],
})
