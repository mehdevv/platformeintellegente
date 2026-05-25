import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Always treat this folder (researcha-app) as project root so .env is found even if the shell cwd is the parent directory.
const appDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, appDir, '')
    const aiApiTarget = (env.VITE_AI_API_URL || 'http://localhost:8000').replace(/\/$/, '')

    return {
    root: appDir,
    envDir: appDir,
    plugins: [react()],
    server: {
        // Dev proxies avoid browser CORS (imgBB + Railway/local FastAPI).
        proxy: {
            '/__ai': {
                target: aiApiTarget,
                changeOrigin: true,
                secure: true,
                rewrite: p => p.replace(/^\/__ai/, ''),
            },
            '/__imgbb': {
                target: 'https://api.imgbb.com',
                changeOrigin: true,
                secure: true,
                rewrite: p => p.replace(/^\/__imgbb/, ''),
            },
        },
    },
    resolve: {
        // One pdfjs-dist for react-pdf + app (avoids API/worker split across versions in dev).
        dedupe: ['pdfjs-dist'],
    },
    // Pre-bundle pdf-lib so dev never serves a stale `node_modules/.vite/deps/pdf-lib.js` (504 Outdated Optimize Dep).
    optimizeDeps: {
        include: ['pdf-lib', 'pdfjs-dist'],
    },
    }
})
