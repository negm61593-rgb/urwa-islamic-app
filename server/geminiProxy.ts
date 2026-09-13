/**
 * Gemini API Proxy Server
 *
 * SECURITY: The GEMINI_API_KEY must NEVER be exposed to the client/browser.
 * All calls to the Gemini API must go through this server-side proxy.
 * The frontend calls /api/gemini, and this server attaches the key server-side.
 */

import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Validate that the API key is present at startup
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('[GeminiProxy] WARNING: GEMINI_API_KEY is not set. AI features will be unavailable.');
}

/**
 * POST /api/gemini/generate
 * Body: { prompt: string, model?: string }
 * Returns: { text: string }
 */
router.post('/generate', async (req, res) => {
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service is not configured.' });
  }

  const { prompt, model = 'gemini-2.0-flash' } = req.body as {
    prompt?: string;
    model?: string;
  };

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

    return res.json({ text: response.text });
  } catch (err) {
    console.error('[GeminiProxy] Error calling Gemini API:', err);
    return res.status(500).json({ error: 'Failed to generate content. Please try again.' });
  }
});

export default router;
