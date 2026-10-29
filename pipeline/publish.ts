// Publication réelle d'une vidéo sur TikTok (Content Posting API, Direct Post, FILE_UPLOAD).
// Exécuté par GitHub Actions (workflow publish-tiktok.yml).
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { WorkerApi, requireEnv, retry, run, sleep } from './lib.ts';

const OPEN_API = 'https://open.tiktokapis.com';
const RELEASE_TAG = 'renders';
const MB = 1024 * 1024;

const apiUrl = requireEnv('API_URL');
const secret = requireEnv('RENDER_SECRET');
const jobId = requireEnv('JOB_ID');
const repo = requireEnv('GITHUB_REPOSITORY');
const api = new WorkerApi(apiUrl, secret);

class TikTokError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const EXPLANATIONS: Record<string, string> = {
  unaudited_client_can_only_post_to_private_accounts:
    "Ton app TikTok n'a pas encore passé l'audit : elle ne peut publier que des vidéos privées (« Moi uniquement ») sur un compte privé.",
  privacy_level_option_mismatch: "Ce niveau de confidentialité n'est pas autorisé pour ce compte.",
  spam_risk_too_many_posts: 'Limite quotidienne de publications atteinte sur ce compte TikTok.',
  spam_risk_user_banned_from_posting: 'TikTok a bloqué les publications de ce compte.',
  reached_active_user_cap: "Le quota quotidien d'utilisateurs de ton app TikTok est atteint.",
  access_token_invalid: 'Session TikTok expirée : reconnecte ton compte.',
  scope_not_authorized: 'Autorisation de publication manquante : reconnecte TikTok.',
  rate_limit_exceeded: 'Trop de requêtes vers TikTok, réessaie dans une minute.',
  file_format_check_failed: 'TikTok a refusé le format du fichier vidéo.',
  duration_check_failed: 'TikTok a refusé la durée de la vidéo.',
  frame_rate_check_failed: 'TikTok a refusé la fréquence d\'images de la vidéo.',
  picture_size_check_failed: 'TikTok a refusé les dimensions de la vidéo.',
  publish_cancelled: 'La publication a été annulée.',
  auth_removed: "L'autorisation de l'app a été retirée dans TikTok : reconnecte ton compte.",
  spam_risk: 'TikTok a classé la publication comme risque de spam.',
  spam_risk_text: 'TikTok a refusé la légende (risque de spam).',
  internal: 'Erreur interne TikTok : réessaie plus tard.',
};

const explain = (code: string, fallback: string): string => EXPLANATIONS[code] || fallback;

interface Envelope<T> {
  data?: T;
  error?: { code?: string; message?: string };
}

async function tiktok<T>(token: string, endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${OPEN_API}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Envelope<T>;
  const code = json.error?.code;
  if (code && code !== 'ok') throw new TikTokError(code, explain(code, json.error?.message || `Erreur TikTok (${code})`));
  if (!res.ok) throw new TikTokError('http', `TikTok a répondu HTTP ${res.status}.`);
  return (json.data ?? {}) as T;
}

async function putChunk(uploadUrl: string, chunk: Buffer, start: number, total: number): Promise<number> {
  return retry('upload chunk', 4, 3000, async () => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes ${start}-${start + chunk.length - 1}/${total}`,
      },
      body: chunk,
    });
    if (res.status === 201 || res.status === 206) return res.status;
    if (res.status >= 500) throw new Error(`TikTok upload HTTP ${res.status}`);
    // Erreur définitive (400, 403 URL expirée, 404, 416) : pas de nouvel essai utile.
    const failure = new Error(`TikTok a refusé l'envoi de la vidéo (HTTP ${res.status}).`);
    (failure as Error & { fatal?: boolean }).fatal = true;
    throw failure;
  });
}

interface CreatorInfo {
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
}

interface StatusData {
  status?: string;
  fail_reason?: string;
  publicaly_available_post_id?: (string | number)[];
  publicly_available_post_id?: (string | number)[];
}

async function main(): Promise<void> {
  const job = await api.getJob(jobId);
  const publish = job.publish;
  if (!job.videoUrl) throw new Error('Aucune vidéo rendue pour ce job.');
  if (!publish.privacy) throw new Error('Paramètres de publication manquants.');

  await api.patchJob(jobId, { status: 'publishing', step: 'Récupération de la vidéo…', progress: 8, error: null });

  const workDir = path.resolve('work');
  await mkdir(workDir, { recursive: true });
  await run('gh', ['release', 'download', RELEASE_TAG, '--repo', repo, '--pattern', `${jobId}.mp4`, '--dir', workDir, '--clobber']);
  const video = await readFile(path.join(workDir, `${jobId}.mp4`));
  const size = video.length;
  if (size < 1000) throw new Error('Fichier vidéo vide.');

  const token = await api.getToken(jobId);

  // Réglages réels du créateur
  await api.patchJob(jobId, { step: 'Vérification du compte TikTok…', progress: 15 });
  const creator = await tiktok<CreatorInfo>(token, '/v2/post/publish/creator_info/query/', {});
  const options = creator.privacy_level_options || [];
  if (!options.includes(publish.privacy)) {
    throw new Error(
      `Le niveau « ${publish.privacy} » n'est pas disponible pour ce compte (options : ${options.join(', ') || 'aucune'}).`,
    );
  }
  const durationSec = Number((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(workDir, `${jobId}.mp4`)])).stdout.trim());
  const maxDuration = creator.max_video_post_duration_sec;
  if (maxDuration && durationSec > maxDuration) {
    throw new Error(`La vidéo (${Math.round(durationSec)} s) dépasse la durée maximale autorisée pour ce compte (${maxDuration} s).`);
  }

  // Initialisation
  await api.patchJob(jobId, { step: 'Initialisation de la publication…', progress: 25 });
  let chunkSize = size;
  let totalChunks = 1;
  if (size > 64 * MB) {
    chunkSize = 32 * MB;
    totalChunks = Math.floor(size / chunkSize);
  }
  const init = await tiktok<{ publish_id?: string; upload_url?: string }>(token, '/v2/post/publish/video/init/', {
    post_info: {
      title: (publish.caption || '').slice(0, 2200),
      privacy_level: publish.privacy,
      disable_comment: publish.disableComment === true || creator.comment_disabled === true,
      disable_duet: publish.disableDuet === true || creator.duet_disabled === true,
      disable_stitch: publish.disableStitch === true || creator.stitch_disabled === true,
      video_cover_timestamp_ms: 1000,
      brand_content_toggle: publish.brandContent === true,
      brand_organic_toggle: publish.brandOrganic === true,
      is_aigc: publish.isAigc === true,
    },
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: size,
      chunk_size: chunkSize,
      total_chunk_count: totalChunks,
    },
  });
  if (!init.publish_id || !init.upload_url) throw new Error("TikTok n'a pas renvoyé d'identifiant de publication.");
  const publishId = init.publish_id;
  await api.patchJob(jobId, { publish: { publishId } });

  // Envoi par morceaux
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = i === totalChunks - 1 ? size : start + chunkSize;
    await api.patchJob(jobId, {
      step: `Envoi de la vidéo à TikTok (${i + 1}/${totalChunks})…`,
      progress: 30 + Math.round((i / totalChunks) * 45),
    });
    await putChunk(init.upload_url, video.subarray(start, end), start, size);
  }

  // Suivi du traitement par TikTok
  await api.patchJob(jobId, { step: 'TikTok traite la vidéo…', progress: 80 });
  let postIds: string[] = [];
  let finalStatus = '';
  for (let attempt = 0; attempt < 90; attempt++) {
    await sleep(5000);
    const status = await tiktok<StatusData>(token, '/v2/post/publish/status/fetch/', { publish_id: publishId });
    finalStatus = status.status || '';
    if (finalStatus === 'FAILED') {
      const reason = status.fail_reason || 'inconnue';
      throw new TikTokError(reason, explain(reason, `TikTok a refusé la vidéo (raison : ${reason}).`));
    }
    if (finalStatus === 'PUBLISH_COMPLETE') {
      postIds = (status.publicaly_available_post_id || status.publicly_available_post_id || []).map(String);
      break;
    }
  }
  if (finalStatus !== 'PUBLISH_COMPLETE') {
    throw new Error('TikTok met trop de temps à traiter la vidéo. Vérifie ton compte TikTok avant de réessayer.');
  }

  await api.patchJob(jobId, {
    status: 'published',
    step: 'Publiée sur TikTok',
    progress: 100,
    error: null,
    publish: { publishId, tiktokStatus: 'PUBLISH_COMPLETE', postIds, error: null },
  });
  console.log(`Publié : publish_id=${publishId} posts=${postIds.join(',') || '(privé ou en modération)'}`);
}

main().catch(async (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('ÉCHEC DE LA PUBLICATION :', message);
  try {
    await api.patchJob(jobId, {
      status: 'rendered',
      step: 'Publication échouée',
      progress: 100,
      publish: { tiktokStatus: 'FAILED', error: message.slice(0, 480) },
    });
  } catch (reportError) {
    console.error("Impossible de signaler l'échec au serveur :", reportError);
  }
  process.exit(1);
});
