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
 * Voix off, dans l'ordre :
 * 1. Edge TTS (timings de mot précis, sous-titres synchronisés) ;
 * 2. MeloTTS via le Worker (Workers AI, sans timings : sous-titres répartis sur la durée) ;
 * 3. gTTS (Google, sans timings) en dernier recours.
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
  const textFile = path.join(options.workDir, 'script.txt');
  const eventsFile = path.join(options.workDir, 'events.json');
  await writeFile(textFile, text, 'utf8');
  const scriptPath = path.join(import.meta.dirname, 'tts.py');

  // 1. Edge TTS : seul moteur qui donne le temps de chaque mot.
  try {
    await retry('edge-tts', 2, 3000, () =>
      run('python3', [
        scriptPath,
        '--engine',
        'edge',
        '--voice',
        options.voice,
        '--rate',
        options.rate ?? '+6%',
        '--pitch',
        options.pitch ?? '+0Hz',
        '--text-file',
        textFile,
        '--audio-out',
        options.audioFile,
        '--events-out',
        eventsFile,
      ]),
    );
    const parsed = JSON.parse(await readFile(eventsFile, 'utf8')) as { kind: string; events: BoundaryEvent[] };
    const info = await probe(options.audioFile);
    if (info.duration >= 1) {
      if (parsed.events.length === 0) console.warn('Edge TTS sans timings : sous-titres répartis.');
      return { audioFile: options.audioFile, audioSec: info.duration, events: parsed.events, kind: parsed.kind, engine: 'edge' };
    }
    console.warn('Audio Edge TTS trop court, repli.');
  } catch (err) {
    console.warn('Edge TTS indisponible (refus ou erreur), repli :', err instanceof Error ? err.message : err);
  }

  // 2. MeloTTS via le Worker.
  if (options.api && options.jobId) {
    try {
      await options.api.speech(text, 'fr', options.jobId, options.audioFile);
      const info = await probe(options.audioFile);
      if (info.duration >= 1) {
        return { audioFile: options.audioFile, audioSec: info.duration, events: [], kind: 'none', engine: 'melotts' };
      }
      console.warn('Voix MeloTTS trop courte, repli gTTS.');
    } catch (err) {
      console.warn('MeloTTS indisponible, repli gTTS :', err instanceof Error ? err.message : err);
    }
  }

  // 3. gTTS.
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
  const info = await probe(options.audioFile);
  if (info.duration < 1) throw new Error("L'audio généré est vide ou trop court.");
  return { audioFile: options.audioFile, audioSec: info.duration, events: [], kind: 'none', engine: 'gtts' };
}
