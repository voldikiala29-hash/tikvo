// Fournisseurs de texte gratuits (API compatibles OpenAI), essayés dans l'ordre.
// Quand un quota est atteint ou qu'un fournisseur échoue, on passe au suivant ; Workers AI reste le dernier recours.
// Aucun import : ce fichier est testé tel quel sous Node.

export interface LlmEnv {
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
}

export interface Provider {
  name: string;
  url: string;
  key: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

/** Fournisseurs configurés (ceux dont la clé existe), dans l'ordre d'essai. */
export function providerChain(env: LlmEnv): Provider[] {
  const chain: Provider[] = [];
  if (env.GROQ_API_KEY) {
    chain.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: env.GROQ_API_KEY,
      model: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    });
  }
  if (env.GEMINI_API_KEY) {
    chain.push({
      name: 'gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || 'gemini-2.0-flash',
    });
  }
  if (env.OPENROUTER_API_KEY) {
    chain.push({
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    });
  }
  return chain;
}

/** Texte de la réponse au format « chat completions ». */
export function extractChatText(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: { content?: unknown } })?.message;
  const content = message?.content;
  return typeof content === 'string' && content.trim() ? content : null;
}

export async function callProvider(
  provider: Provider,
  messages: ChatMessage[],
  maxTokens: number,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(provider.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
      body: JSON.stringify({ model: provider.model, messages, max_tokens: maxTokens, temperature: 0.8 }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${provider.name} : erreur HTTP ${res.status}`);
    const text = extractChatText(await res.json());
    if (!text) throw new Error(`${provider.name} : réponse vide`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}
