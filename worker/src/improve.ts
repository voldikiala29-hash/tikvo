import { callModel } from './scripts';
import { IMPROVE_SYSTEM, acceptImproved, improvePrompt } from './scriptImprove';

/** Script amélioré si la version du modèle respecte les règles, sinon le script d'origine. */
export async function improveScript(env: Parameters<typeof callModel>[0], script: string, niche: string): Promise<{ script: string; improved: boolean }> {
  try {
    const raw = await callModel(env, improvePrompt(script, niche), 800, IMPROVE_SYSTEM);
    const accepted = acceptImproved(script, raw);
    if (accepted) return { script: accepted, improved: true };
    console.warn('[improve] version refusée par les règles, script d’origine conservé');
  } catch (err) {
    console.warn('[improve] indisponible, script d’origine conservé :', err instanceof Error ? err.message : err);
  }
  return { script, improved: false };
}
