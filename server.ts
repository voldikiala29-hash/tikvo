import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'tikvo-engine', time: new Date().toISOString() });
  });

  // API Route: /api/generate-video
  // Receives { niche, script, keywords, hook }
  // Synthesizes voice via edge-tts, selects 3 Pexels 4K clips, configures Remotion ViralTemplate
  app.post('/api/generate-video', async (req, res) => {
    try {
      const { niche, script, keywords = [], hook = '' } = req.body;

      console.log(`[tikvo Engine] Generating 1080x1920 video for niche "${niche}" with keywords:`, keywords);

      // Le rendu Remotion côté serveur n'est pas encore branché : on le dit
      // clairement au lieu de renvoyer une fausse vidéo "rendue".
      // Le front garde alors le clip Pexels sélectionné comme aperçu.
      const renderId = 'tikvo_render_' + Math.random().toString(36).substring(2, 9);

      res.json({
        success: true,
        simulated: true,
        renderId,
        videoUrl: null,
        niche,
        hook,
        fps: 30,
        resolution: '1080x1920',
        duration: 30,
        status: 'RENDER_NOT_IMPLEMENTED',
        message: 'Rendu serveur non implémenté : aucune vidéo n\'a été générée (réponse simulée).',
      });
    } catch (error: any) {
      console.error('[tikvo Engine Error]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API Route: /api/tiktok/post
  // Posts or schedules video directly to TikTok Business Direct Post API
  app.post('/api/tiktok/post', async (req, res) => {
    try {
      const { caption, privacyLevel = 'PUBLIC_TO_EVERYONE' } = req.body;

      console.log('[tikvo TikTok API] Publish request received:', { caption, privacyLevel });

      // Aucun appel à TikTok n'est fait ici (OAuth + Direct Post API à implémenter).
      // On répond 501 plutôt que d'inventer un publishId / un lien TikTok.
      res.status(501).json({
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'La publication TikTok réelle n\'est pas encore implémentée : rien n\'a été publié.',
      });
    } catch (error: any) {
      console.error('[TikTok Post Error]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Redirect root to /tikvo/ so access works seamlessly in development and production
  app.get('/', (req, res) => {
    res.redirect('/tikvo/');
  });

  // Mount Vite middleware in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[tikvo Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
