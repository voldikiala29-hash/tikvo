import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BoundaryEvent } from '../src/video-engine/timeline.ts';
import { probe, retry, run, type WorkerApi } from './lib.ts';

export interface VoiceResult {
  audioFile: string;
  audioSec: number;
  events: BoundaryEvent[];
  kind: string;
  /** « melotts » (Workers AI) ou « gtts » (secours). */
  engine: string;
}

/** Retire les emojis et symboles : la voix les lirait à haute voix (« fusée », « feu »...). */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/#/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Voix off : MeloTTS via le Worker (gratuit, Workers AI) ; si indisponible, gTTS (Google, sans clé).
 * Edge TTS n'est plus utilisé (refus 403 fréquents). MeloTTS ne donne pas de timings de mot :
 * les sous-titres sont alors répartis sur la durée de la voix.
 */
export async function synthesizeVoice(options: {
  text: string;
  voice: string;
  workDir: string;
  audioFile: string;
  rate?: string;
  pitch?: string;
  api?: WorkerApi;
  jobId?: string;
}): Promise<VoiceResult> {
  const text = cleanForSpeech(options.text);
  if (text.length < 10) throw new Error('Le script est vide après nettoyage.');

  await mkdir(options.workDir, { recursive: true });
  await mkdir(path.dirname(options.audioFile), { recursive: true });

  if (options.api && options.jobId) {
    try {
      await options.api.speech(text, 'fr', options.jobId, options.audioFile);
      const info = await probe(options.audioFile);
      if (info.duration >= 1) {
        return { audioFile: options.audioFile, audioSec: info.duration, events: [], kind: 'none', engine: 'melotts' };
      }
      console.warn('Voix Workers AI trop courte, bascule sur gTTS.');
    } catch (err) {
      console.warn('Voix Workers AI indisponible, repli gTTS :', err instanceof Error ? err.message : err);
    }
  }

  const textFile = path.join(options.workDir, 'script.txt');
  const eventsFile = path.join(options.workDir, 'events.json');
  await writeFile(textFile, text, 'utf8');

  const scriptPath = path.join(import.meta.dirname, 'tts.py');
  await retry('gtts', 2, 3000, () =>
    run('python3', [
      scriptPath,
      '--engine',
      'gtts',
      '--voice',
      options.voice,
      '--text-file',
      textFile,
      '--audio-out',
      options.audioFile,
      '--events-out',
      eventsFile,
    ]),
  );

  const parsed = JSON.parse(await readFile(eventsFile, 'utf8')) as { kind: string; events: BoundaryEvent[]; engine?: string };
  const info = await probe(options.audioFile);
  if (info.duration < 1) throw new Error("L'audio généré est vide ou trop court.");
  return { audioFile: options.audioFile, audioSec: info.duration, events: parsed.events, kind: parsed.kind, engine: parsed.engine ?? 'gtts' };
}
