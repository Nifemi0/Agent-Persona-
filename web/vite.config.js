import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { ipfsUploadPlugin } from './src/plugins/ipfs-upload'

export default defineConfig(({ mode }) => {
  // Load env file so server-side middleware can access it
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      ipfsUploadPlugin(env.PINATA_JWT || ''),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true,
    },
  }
})
