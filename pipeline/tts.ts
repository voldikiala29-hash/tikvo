import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BoundaryEvent } from '../src/video-engine/timeline.ts';
import { probe, retry, run } from './lib.ts';

export interface VoiceResult {
  audioFile: string;
  audioSec: number;
  events: BoundaryEvent[];
  kind: string;
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

export async function synthesizeVoice(options: {
  text: string;
  voice: string;
  workDir: string;
  audioFile: string;
  rate?: string;
}): Promise<VoiceResult> {
  const text = cleanForSpeech(options.text);
  if (text.length < 10) throw new Error('Le script est vide après nettoyage.');

  await mkdir(options.workDir, { recursive: true });
  await mkdir(path.dirname(options.audioFile), { recursive: true });
  const textFile = path.join(options.workDir, 'script.txt');
  const eventsFile = path.join(options.workDir, 'events.json');
  await writeFile(textFile, text, 'utf8');

  const scriptPath = path.join(import.meta.dirname, 'tts.py');
  await retry('edge-tts', 3, 4000, () =>
    run('python3', [
      scriptPath,
      '--voice',
      options.voice,
      '--rate',
      options.rate ?? '+6%',
      '--text-file',
      textFile,
      '--audio-out',
      options.audioFile,
      '--events-out',
      eventsFile,
    ]),
  );

  const parsed = JSON.parse(await readFile(eventsFile, 'utf8')) as { kind: string; events: BoundaryEvent[]; engine?: string };
  const engine = parsed.engine ?? 'edge';
  if (engine !== 'edge') console.warn(`Voix : moteur de secours utilisé (${engine}) après un refus d'Edge TTS.`);
  const info = await probe(options.audioFile);
  if (info.duration < 1) throw new Error("L'audio généré est vide ou trop court.");
  return { audioFile: options.audioFile, audioSec: info.duration, events: parsed.events, kind: parsed.kind, engine };
}
