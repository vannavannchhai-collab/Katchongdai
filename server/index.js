import http from 'node:http';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_INDEX = path.join(ROOT_DIR, 'dist', 'index.html');
const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(DIST_INDEX);
const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  app.use(express.json({ limit: '15mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Katchongdai Pro', time: new Date().toISOString() });
  });

  // Mount API routes
  app.use('/api', apiRouter);

  // Clean JSON handler for any unmatched /api path
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `រកមិនឃើញផ្លូវ API៖ ${req.originalUrl}` });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: ROOT_DIR,
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(DIST_INDEX);
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Katchongdai Pro Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
