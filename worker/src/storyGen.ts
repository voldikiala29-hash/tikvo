// Génération des histoires et des sujets proposés : appels au modèle de texte, avec validation.
import { callModel } from './scripts';
import { HttpError, type Env } from './types';
import { STORY_SYSTEM, SUBJECT_FALLBACK, parseStory, parseSubjects, storyPrompt, subjectsPrompt, type Story, type StoryRequest } from '../../src/video-engine/story';

const ATTEMPTS = 2;

/** Histoire complète, validée. Une seconde tentative si la première réponse ne respecte pas le format. */
export async function generateStory(env: Env, request: StoryRequest): Promise<Story> {
  let lastError = 'réponse vide';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const raw = await callModel(env, storyPrompt(request), 2500, STORY_SYSTEM);
    try {
      return parseStory(raw, request.mode);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[story] tentative ${attempt}/${ATTEMPTS} refusée : ${lastError}`);
    }
  }
  throw new HttpError(502, 'story_invalid', `Histoire refusée par les règles : ${lastError}`);
}

/** Sujets proposés : jamais d'erreur visible, la liste de repli prend le relais. */
export async function suggestSubjects(env: Env): Promise<string[]> {
  try {
    return parseSubjects(await callModel(env, subjectsPrompt(), 500, STORY_SYSTEM));
  } catch (err) {
    console.warn('[story] sujets indisponibles, liste de repli :', err instanceof Error ? err.message : err);
    return SUBJECT_FALLBACK;
  }
}

export const STORY_DAILY_LIMIT = 30;

/** Compte une génération par IA pour le jour (UTC) ; refuse au-delà de la limite. Le mode script balisé n'est pas compté. */
export async function reserveStoryQuota(env: Env, uid: string): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const row = await env.DB.prepare('SELECT n FROM story_usage WHERE uid = ? AND day = ?').bind(uid, day).first<{ n: number }>();
  if ((row?.n ?? 0) >= STORY_DAILY_LIMIT) {
    throw new HttpError(429, 'quota', `Limite quotidienne atteinte (${STORY_DAILY_LIMIT} générations d'histoires par jour).`);
  }
  await env.DB.prepare(
    'INSERT INTO story_usage (uid, day, n) VALUES (?, ?, 1) ON CONFLICT(uid, day) DO UPDATE SET n = n + 1',
  )
    .bind(uid, day)
    .run();
}
