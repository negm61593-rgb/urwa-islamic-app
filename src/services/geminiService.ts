/**
 * Gemini AI Service (Frontend)
 *
 * SECURITY: This service calls the backend proxy (/api/gemini) instead of
 * the Gemini API directly. The API key is NEVER exposed to the browser.
 */

const PROXY_BASE = '/api/gemini';

export interface GeminiResponse {
  text: string;
}

export const geminiService = {
  /**
   * Generate content via the secure backend proxy.
   * @param prompt - The text prompt to send to Gemini
   * @param model  - Optional model name (defaults to gemini-2.0-flash on the server)
   */
  async generateContent(prompt: string, model?: string): Promise<string> {
    const response = await fetch(`${PROXY_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error ?? `Request failed with status ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    return data.text;
  },
};
