import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite conexões externas ao container
    port: 5173,
    allowedHosts: [
      'nic.mdradvocacia.com', // Adicione o seu domínio aqui
      '.mdradvocacia.com'     // O ponto no início permite qualquer subdomínio
    ]
  }
})
