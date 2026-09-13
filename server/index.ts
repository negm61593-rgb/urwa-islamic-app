/**
 * Express Backend Server
 *
 * Serves as a secure proxy for API keys and sensitive operations.
 * The frontend (Vite/React) runs separately on port 3000.
 * This server runs on port 3001 (or PORT env variable).
 */

import express from 'express';
import dotenv from 'dotenv';
import geminiProxy from './geminiProxy';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Middleware
app.use(express.json({ limit: '1mb' }));

// CORS: only allow requests from the frontend dev server and production origin
const allowedOrigins = [
  'http://localhost:3000',
  process.env.APP_URL,
].filter(Boolean) as string[];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Routes
app.use('/api/gemini', geminiProxy);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] Backend proxy running on http://localhost:${PORT}`);
  console.log(`[Server] Gemini API key: ${process.env.GEMINI_API_KEY ? '✓ configured' : '✗ NOT SET'}`);
});

export default app;
