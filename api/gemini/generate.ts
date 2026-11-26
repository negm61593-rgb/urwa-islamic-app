import { GoogleGenAI } from '@google/genai';

const ALLOWED_ORIGINS = new Set([
  'https://urwa-islamic.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
]);

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin;
  if (origin && (ALLOWED_ORIGINS.has(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service is not configured (GEMINI_API_KEY is not set).' });
  }

  const { prompt, model = 'gemini-2.0-flash' } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'A non-empty prompt is required.' });
  }

  if (prompt.length > 10000) {
    return res.status(400).json({ error: 'Prompt exceeds maximum allowed length.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt.trim(),
    });

    return res.status(200).json({ text: response.text });
  } catch (err: any) {
    console.error('[Vercel Gemini API] Error:', err);
    return res.status(500).json({ error: 'Failed to generate content. Please try again.' });
  }
}
