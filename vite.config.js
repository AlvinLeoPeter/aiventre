import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// In `npm run dev`, serve the Vercel functions in /api locally so the app
// works without the Vercel CLI. Mimics the bits of Vercel's req/res we use.
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const name = req.url.split('?')[0].replace(/^\/+/, '')
        if (!/^[a-z-]+$/.test(name)) {
          res.statusCode = 404
          return res.end()
        }
        let body = ''
        for await (const chunk of req) body += chunk
        req.body = body ? JSON.parse(body) : {}
        res.status = (code) => ((res.statusCode = code), res)
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        }
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          await mod.default(req, res)
        } catch (err) {
          console.error(err)
          res.status(500).json({ error: 'Local API error' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Expose server-side secrets (ANTHROPIC_API_KEY, APP_ACCESS_CODE) to the local API only.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), localApi()],
    server: { port: 5173 },
  }
})
