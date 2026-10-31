// Rendu réel d'une vidéo tikvo, exécuté par GitHub Actions (workflow render-video.yml).
// Voix off Edge TTS → clips Pixabay (en parallèle) → montage Remotion aux dimensions choisies → release GitHub.
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { composeProps, MAX_VIDEO_SECONDS, TAIL_SECONDS, resolveBranding } from './compose.ts';
import { ProgressReporter, WorkerApi, probe, requireEnv, run } from './lib.ts';
import { buildQueries, collectClips, downloadTo } from './stock.ts';
import { renderViral } from './renderer.ts';
import { synthesizeVoice } from './tts.ts';
import { aspectSize, clipCountFor, resolveRenderSettings } from '../src/video-engine/montage.ts';

const RELEASE_TAG = 'renders';
const KEEP_ASSETS = 300;
const MAX_BYTES = 60 * 1024 * 1024;
const MIN_CLIPS = 2;
const DOWNLOAD_PARALLEL = 4;

const apiUrl = requireEnv('API_URL');
const secret = requireEnv('RENDER_SECRET');
const jobId = requireEnv('JOB_ID');
const repo = requireEnv('GITHUB_REPOSITORY');

const api = new WorkerApi(apiUrl, secret);
const reporter = new ProgressReporter(api, jobId, 'rendering');

async function uploadRelease(file: string, assetName: string): Promise<string> {
  try {
    await run('gh', ['release', 'view', RELEASE_TAG, '--repo', repo]);
  } catch {
    await run('gh', [
      'release',
      'create',
      RELEASE_TAG,
      '--repo',
      repo,
      '--prerelease',
      '--title',
      'Rendus tikvo',
      '--notes',
      'Vidéos générées automatiquement par tikvo. Les plus anciennes sont supprimées.',
    ]);
  }
  await run('gh', ['release', 'upload', RELEASE_TAG, `${file}#${assetName}`, '--repo', repo, '--clobber']);
  return `https://github.com/${repo}/releases/download/${RELEASE_TAG}/${assetName}`;
}

async function pruneOldAssets(): Promise<void> {
  try {
    const { stdout } = await run('gh', ['release', 'view', RELEASE_TAG, '--repo', repo, '--json', 'assets']);
    const assets = (JSON.parse(stdout) as { assets: { name: string; createdAt: string }[] }).assets;
    const old = assets.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(KEEP_ASSETS);
    for (const asset of old) {
      await run('gh', ['release', 'delete-asset', RELEASE_TAG, asset.name, '--repo', repo, '--yes']);
    }
  } catch (err) {
    console.warn('Nettoyage des anciens rendus ignoré :', err instanceof Error ? err.message : err);
  }
}

/** Traite les éléments par lots de `limit` en parallèle. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main(): Promise<void> {
  const job = await api.getJob(jobId);
  const params = job.params;
  if (!params.script || !params.hook || !params.niche) throw new Error('Paramètres du job incomplets.');
  const settings = resolveRenderSettings(params.settings);
  const size = aspectSize(settings.aspect);

  const workDir = path.resolve('work');
  const publicDir = path.join(workDir, 'public');
  await rm(workDir, { recursive: true, force: true });
  await mkdir(path.join(publicDir, 'clips'), { recursive: true });
  await mkdir(path.join(publicDir, 'audio'), { recursive: true });

  // 1. Voix off : c'est elle qui fixe la durée de la vidéo.
  await reporter.report('Synthèse de la voix off (Edge TTS)…', 5, true);
  const voice = await synthesizeVoice({
    text: params.script,
    voice: params.voice || 'fr-FR-VivienneMultilingualNeural',
    workDir,
    audioFile: path.join(publicDir, 'audio', 'voice.mp3'),
  });
  console.log(`Voix : ${voice.audioSec.toFixed(1)} s, moteur ${voice.engine}, événements ${voice.kind} (${voice.events.length})`);
  if (voice.audioSec + TAIL_SECONDS > MAX_VIDEO_SECONDS) {
    throw new Error(`La voix dure ${Math.round(voice.audioSec)} s : raccourcis le script (maximum ${MAX_VIDEO_SECONDS - 1} s).`);
  }
  const totalSec = voice.audioSec + TAIL_SECONDS;

  // 2. Plans : nombre choisi par l'utilisateur, ou automatique selon la durée.
  const need = clipCountFor(totalSec, settings.clipsPerScript);
  await reporter.report(`Recherche de ${need} plans Pixabay…`, 15, true);
  const pixabayKey = requireEnv('PEXELS_API_KEY'); // nom du secret conservé pendant la transition
  const candidates = await collectClips({
    need,
    ids: params.pexelsIds || [],
    queries: buildQueries(params.niche.id, params.keywords || []),
    key: pixabayKey,
  });
  if (candidates.length < Math.min(MIN_CLIPS, need)) {
    throw new Error(`Pixabay n'a trouvé que ${candidates.length} clip(s) vertical(aux) pour ces mots-clés.`);
  }

  // Téléchargements en parallèle (4 à la fois).
  let downloaded = 0;
  const results = await mapLimit(candidates, DOWNLOAD_PARALLEL, async (candidate, i) => {
    const rel = `clips/clip-${i + 1}.mp4`;
    const dest = path.join(publicDir, rel);
    try {
      await downloadTo(candidate.link, dest);
      const info = await probe(dest);
      if (info.duration < 1) throw new Error('clip trop court');
      return { id: `pixabay-${candidate.id}`, src: rel, durationSec: info.duration, credit: candidate.credit };
    } catch (err) {
      console.warn(`Clip ${candidate.id} ignoré : ${err instanceof Error ? err.message : err}`);
      return null;
    } finally {
      downloaded++;
      await reporter.report(`Téléchargement des plans (${downloaded}/${candidates.length})…`, 15 + Math.round((downloaded / candidates.length) * 20));
    }
  });
  const clips = results.filter((c): c is NonNullable<typeof c> => c !== null);
  if (clips.length < Math.min(MIN_CLIPS, need)) throw new Error(`Moins de ${MIN_CLIPS} plans exploitables après téléchargement.`);

  // 3. Montage aux dimensions et avec le style choisis.
  const props = composeProps({
    hook: params.hook,
    nicheName: params.niche.name,
    script: params.script,
    events: voice.events,
    audioSec: voice.audioSec,
    audioSrc: 'audio/voice.mp3',
    clips,
    branding: resolveBranding(params.branding),
    settings,
  });

  await reporter.report('Montage Remotion : préparation…', 36, true);
  const outFile = path.join(workDir, `${jobId}.mp4`);
  await renderViral({
    props,
    publicDir,
    outFile,
    onBundleProgress: (p) => void reporter.report(`Montage Remotion : préparation (${p} %)…`, 36 + Math.round(p * 0.08)),
    onRenderProgress: (p) => void reporter.report(`Rendu ${size.width}×${size.height} (${p} %)…`, 45 + Math.round(p * 0.45)),
  });

  // 4. Contrôle du fichier produit
  await reporter.report('Contrôle de la vidéo…', 91, true);
  const info = await probe(outFile);
  if (info.videoCodec !== 'h264') throw new Error(`Codec inattendu : ${info.videoCodec}`);
  if (info.width !== size.width || info.height !== size.height) {
    throw new Error(`Dimensions inattendues : ${info.width}×${info.height} (attendu ${size.width}×${size.height})`);
  }
  if (!info.hasAudio) throw new Error("La vidéo rendue n'a pas de piste audio.");
  if (info.size > MAX_BYTES) throw new Error(`Vidéo trop lourde (${Math.round(info.size / 1048576)} Mo, maximum 60 Mo).`);
  if (info.duration < voice.audioSec) throw new Error(`Vidéo plus courte que la voix : ${info.duration.toFixed(1)} s.`);

  // 5. Envoi
  await reporter.report('Envoi de la vidéo…', 94, true);
  const videoUrl = await uploadRelease(outFile, `${jobId}.mp4`);
  await pruneOldAssets();

  await api.patchJob(jobId, {
    status: 'rendered',
    step: 'Vidéo prête',
    progress: 100,
    videoUrl,
    videoBytes: info.size,
    durationSec: Math.round(info.duration * 10) / 10,
    error: null,
  });
  console.log(`Terminé : ${videoUrl} (${(info.size / 1048576).toFixed(1)} Mo, ${info.duration.toFixed(1)} s, ${size.width}×${size.height})`);
}

main().catch(async (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('ÉCHEC DU RENDU :', message);
  try {
    await api.patchJob(jobId, { status: 'failed', step: 'Échec du rendu', error: message.slice(0, 480) });
  } catch (reportError) {
    console.error("Impossible de signaler l'échec au serveur :", reportError);
  }
  process.exit(1);
});
