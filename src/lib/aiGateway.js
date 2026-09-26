import { supabase } from './supabase.js';

const AI_TIMEOUT_MS = 20_000;
const ALLOWED_LANGUAGES = new Set(['pt', 'en', 'fr']);

export async function generateAiReply({ text, language = 'pt' }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const safeLanguage = ALLOWED_LANGUAGES.has(language) ? language : 'pt';
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { text, language: safeLanguage },
      signal: controller.signal,
    });
    if (error) throw error;
    if (!data || typeof data.text !== 'string') throw new Error('AI service returned an invalid response.');
    return data;
  } finally { clearTimeout(timeoutId); }
}