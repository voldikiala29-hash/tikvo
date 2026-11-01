import { HttpError, Env } from './types';
import { TTS_MODEL, audioFromOutput } from './aiModels';
import { runWorkersAi } from './scripts';

const MAX_CHARS = 2000;
const MIN_AUDIO_BYTES = 1000;

/**
 * Voix off gratuite via MeloTTS (Workers AI). Renvoie le MP3.
 * Si le binding R2 « MEDIA » est actif et qu'un identifiant de job est fourni, une copie est rangée dans voice/{jobId}.mp3.
 */
export async function synthesizeSpeech(env: Env, rawText: string, lang: string, jobId: string | null): Promise<Uint8Array> {
  const text = rawText.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
  if (text.length < 2) throw new HttpError(400, 'invalid_param', 'Texte vide.');
  const out = await runWorkersAi(env, TTS_MODEL, { prompt: text, lang }, 45_000);
  const audio = await audioFromOutput(out);
  if (audio.byteLength < MIN_AUDIO_BYTES) {
    throw new HttpError(502, 'tts_failed', 'La voix Workers AI n’a renvoyé aucun audio exploitable.');
  }
  if (jobId && env.MEDIA) {
    try {
      await env.MEDIA.put(`voice/${jobId}.mp3`, audio, { httpMetadata: { contentType: 'audio/mpeg' } });
    } catch (err) {
      // Copie facultative : l'audio part quand même vers le rendu.
      console.warn('[tts] copie R2 ignorée', err instanceof Error ? err.message : err);
    }
  }
  return audio;
}
