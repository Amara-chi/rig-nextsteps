import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// Two independent entry points, matching the app's current shape: the staff
// admin app at the domain root, and the public visitor check-in form at
// /checkin. Each mounts its own React root with no shared code path between
// them, so the checkin bundle never carries any admin-only code.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        checkin: resolve(import.meta.dirname, 'checkin/index.html'),
      },
    },
  },
})
