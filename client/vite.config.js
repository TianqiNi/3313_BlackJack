import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',       // Explicitly bind to localhost
    port: 5173,              // Frontend runs on http://localhost:5173
    strictPort: true,        // Fail if 5173 is taken
    cors: true,              // Enable CORS just in case
  }
})
