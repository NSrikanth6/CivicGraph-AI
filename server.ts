import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory issue repository for server-side demo mode
let serverIssues: any[] = [];

// ================= API ROUTES =================

/**
 * Health Check
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'CivicGraph AI API Engine',
  });
});

/**
 * Get all issues
 */
app.get('/api/issues', (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: serverIssues.length,
    data: serverIssues,
  });
});

/**
 * Create or sync issues
 */
app.post('/api/issues', (req: Request, res: Response) => {
  const issue = req.body;
  if (!issue.title) {
    return res.status(400).json({ error: 'Issue title is required' });
  }

  const created = {
    ...issue,
    id: issue.id || `issue-${Date.now()}`,
    createdDate: issue.createdDate || new Date().toISOString(),
    updatedDate: new Date().toISOString(),
  };

  serverIssues.unshift(created);
  res.status(201).json({ success: true, data: created });
});

/**
 * Update issue
 */
app.put('/api/issues/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = serverIssues.findIndex((i) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  serverIssues[index] = {
    ...serverIssues[index],
    ...req.body,
    updatedDate: new Date().toISOString(),
  };

  res.json({ success: true, data: serverIssues[index] });
});

/**
 * Delete issue
 */
app.delete('/api/issues/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  serverIssues = serverIssues.filter((i) => i.id !== id);
  res.json({ success: true, message: 'Issue removed' });
});

/**
 * Batch import
 */
app.post('/api/import', (req: Request, res: Response) => {
  const { issues } = req.body;
  if (!Array.isArray(issues)) {
    return res.status(400).json({ error: 'Invalid payload: issues array required' });
  }
  serverIssues = issues;
  res.json({ success: true, count: serverIssues.length });
});

// ================= FRONTEND / VITE SERVER MOUNT =================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicGraph AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CivicGraph server:', err);
  process.exit(1);
});
