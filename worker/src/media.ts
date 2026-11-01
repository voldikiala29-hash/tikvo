// Médias de l'utilisateur (photos et vidéos envoyées) : stockés dans R2, décrits par l'utilisateur.
import { HttpError, Env } from './types';
import { MAX_MEDIA_BYTES, MAX_MEDIA_PER_USER, mediaType } from './mediaRules';
export { cleanDescription } from './mediaRules';

export interface MediaRow {
  id: string;
  uid: string;
  kind: 'image' | 'video';
  mime: string;
  ext: string;
  bytes: number;
  description: string;
  created_at: number;
}

export function mediaKey(uid: string, id: string, ext: string): string {
  return `${uid}/${id}.${ext}`;
}

/** Le stockage n'existe qu'une fois le bucket R2 activé et lié au Worker. */
function bucketOrFail(env: Env) {
  if (!env.MEDIA_BUCKET) throw new HttpError(503, 'media_disabled', 'Le stockage des photos et vidéos n’est pas encore activé.');
  return env.MEDIA_BUCKET;
}

export function publicMedia(row: MediaRow) {
  return { id: row.id, kind: row.kind, mime: row.mime, bytes: row.bytes, description: row.description, createdAt: row.created_at };
}

export async function listUserMedia(env: Env, uid: string): Promise<MediaRow[]> {
  const rows = await env.DB.prepare('SELECT * FROM media WHERE uid = ? ORDER BY created_at DESC LIMIT ?')
    .bind(uid, MAX_MEDIA_PER_USER)
    .all<MediaRow>();
  return rows.results ?? [];
}

export async function addUserMedia(env: Env, uid: string, mime: string, description: string, data: ArrayBuffer): Promise<MediaRow> {
  const bucket = bucketOrFail(env);
  const type = mediaType(mime);
  if (!type) throw new HttpError(415, 'unsupported_type', 'Format non accepté : JPG, PNG, WebP, MP4 ou MOV.');
  if (data.byteLength === 0) throw new HttpError(400, 'empty', 'Fichier vide.');
  if (data.byteLength > MAX_MEDIA_BYTES) throw new HttpError(413, 'too_large', 'Fichier trop lourd (25 Mo maximum).');
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM media WHERE uid = ?').bind(uid).first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_MEDIA_PER_USER) {
    throw new HttpError(429, 'quota', `Tu as atteint ${MAX_MEDIA_PER_USER} médias. Supprime-en pour en ajouter.`);
  }
  const id = crypto.randomUUID();
  const mimeType = mime.split(';')[0].trim();
  await bucket.put(mediaKey(uid, id, type.ext), data, { httpMetadata: { contentType: mimeType } });
  const row: MediaRow = {
    id,
    uid,
    kind: type.kind,
    mime: mimeType,
    ext: type.ext,
    bytes: data.byteLength,
    description,
    created_at: Date.now(),
  };
  await env.DB.prepare(
    'INSERT INTO media (id, uid, kind, mime, ext, bytes, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(row.id, row.uid, row.kind, row.mime, row.ext, row.bytes, row.description, row.created_at)
    .run();
  return row;
}

export async function updateUserMedia(env: Env, uid: string, id: string, description: string): Promise<void> {
  const res = await env.DB.prepare('UPDATE media SET description = ? WHERE id = ? AND uid = ?').bind(description, id, uid).run();
  if (!res.meta?.changes) throw new HttpError(404, 'not_found', 'Média introuvable.');
}

export async function deleteUserMedia(env: Env, uid: string, id: string): Promise<void> {
  const bucket = bucketOrFail(env);
  const row = await env.DB.prepare('SELECT * FROM media WHERE id = ? AND uid = ?').bind(id, uid).first<MediaRow>();
  if (!row) throw new HttpError(404, 'not_found', 'Média introuvable.');
  await bucket.delete(mediaKey(uid, id, row.ext));
  await env.DB.prepare('DELETE FROM media WHERE id = ? AND uid = ?').bind(id, uid).run();
}

/** Fichier d'un média de l'utilisateur (aperçu dans l'app). */
export async function userMediaFile(env: Env, uid: string, id: string): Promise<Response> {
  const bucket = bucketOrFail(env);
  const row = await env.DB.prepare('SELECT * FROM media WHERE id = ? AND uid = ?').bind(id, uid).first<MediaRow>();
  if (!row) throw new HttpError(404, 'not_found', 'Média introuvable.');
  const object = await bucket.get(mediaKey(uid, id, row.ext));
  if (!object) throw new HttpError(404, 'not_found', 'Fichier introuvable.');
  return new Response(object.body, { headers: { 'Content-Type': row.mime, 'Cache-Control': 'private, max-age=3600' } });
}

/** Fichier d'un média pour le pipeline de rendu (appel interne authentifié par le secret de rendu). */
export async function mediaFileForPipeline(env: Env, id: string): Promise<Response> {
  const bucket = bucketOrFail(env);
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(400, 'invalid_param', 'Identifiant invalide.');
  const row = await env.DB.prepare('SELECT * FROM media WHERE id = ?').bind(id).first<MediaRow>();
  if (!row) throw new HttpError(404, 'not_found', 'Média introuvable.');
  const object = await bucket.get(mediaKey(row.uid, id, row.ext));
  if (!object) throw new HttpError(404, 'not_found', 'Fichier introuvable.');
  return new Response(object.body, { headers: { 'Content-Type': row.mime } });
}

/** Liste compacte transmise au pipeline avec le rendu : ce que l'utilisateur a envoyé et ce que ça montre. */
export function mediaForJob(rows: MediaRow[]) {
  return rows.map((r) => ({ id: r.id, kind: r.kind, ext: r.ext, description: r.description }));
}
