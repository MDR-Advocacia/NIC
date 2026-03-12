import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'lab-nic.mdradvocacia.com',
      'localhost'
    ],
    proxy: {
      // Isso redireciona qualquer chamada para /api/v1 para o servidor correto
      '/api/v1': {
        target: 'https://api-nic-lab.mdradvocacia.com',
        changeOrigin: true,
        secure: false,
      },
      // Isso garante que as rotas antigas /api/chat continuem funcionando
      '/api/chat': {
        target: 'https://api-nic-lab.mdradvocacia.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})