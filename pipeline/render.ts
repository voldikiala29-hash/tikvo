// Rendu réel d'une vidéo tikvo, exécuté par GitHub Actions (workflow render-video.yml).
// Voix off Edge TTS → clips Pixabay → montage Remotion 1080x1920 → upload dans une release GitHub.
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { composeProps, MAX_VIDEO_SECONDS, TAIL_SECONDS } from './compose.ts';
import { ProgressReporter, WorkerApi, probe, requireEnv, run } from './lib.ts';
import { buildQueries, collectClips, downloadTo } from './stock.ts';
import { renderViral } from './renderer.ts';
import { synthesizeVoice } from './tts.ts';

const RELEASE_TAG = 'renders';
const KEEP_ASSETS = 300;
const ALLOWED_DURATIONS = [15, 30, 60];
const SECONDS_PER_CLIP = 5;
const MIN_CLIPS = 3;
const MAX_CLIPS = 12;
const MAX_BYTES = 60 * 1024 * 1024;

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

async function main(): Promise<void> {
  const job = await api.getJob(jobId);
  const params = job.params;
  if (!params.script || !params.hook || !params.niche) throw new Error('Paramètres du job incomplets.');

  const workDir = path.resolve('work');
  const publicDir = path.join(workDir, 'public');
  await rm(workDir, { recursive: true, force: true });
  await mkdir(path.join(publicDir, 'clips'), { recursive: true });
  await mkdir(path.join(publicDir, 'audio'), { recursive: true });

  // 1. Voix off
  await reporter.report('Synthèse de la voix off (Edge TTS)…', 5, true);
  const voice = await synthesizeVoice({
    text: params.script,
    voice: params.voice || 'fr-FR-VivienneMultilingualNeural',
    workDir,
    audioFile: path.join(publicDir, 'audio', 'voice.mp3'),
  });
  console.log(`Voix : ${voice.audioSec.toFixed(1)} s, événements ${voice.kind} (${voice.events.length})`);
  if (voice.audioSec + TAIL_SECONDS > MAX_VIDEO_SECONDS) {
    throw new Error(`La voix dure ${Math.round(voice.audioSec)} s : raccourcis le script (maximum ${MAX_VIDEO_SECONDS - 1} s).`);
  }

  // 2. Durée cible (15, 30 ou 60 s) et nombre de plans : un plan toutes les 5 secondes, entre 3 et 12.
  const requested = Number(params.duration) || 15;
  if (!ALLOWED_DURATIONS.includes(requested)) throw new Error(`Durée non prise en charge : ${requested} s.`);
  const targetSec = Math.max(requested, voice.audioSec + TAIL_SECONDS);
  const need = Math.min(MAX_CLIPS, Math.max(MIN_CLIPS, Math.ceil(targetSec / SECONDS_PER_CLIP)));

  // 3. Clips Pixabay, tous distincts
  await reporter.report('Recherche des clips Pixabay…', 15, true);
  const pixabayKey = requireEnv('PEXELS_API_KEY'); // nom du secret conservé pendant la transition
  const candidates = await collectClips({
    need,
    ids: params.pexelsIds || [],
    queries: buildQueries(params.niche.id, params.keywords || []),
    key: pixabayKey,
  });
  if (candidates.length < MIN_CLIPS) {
    throw new Error(`Pixabay n'a trouvé que ${candidates.length} clip(s) vertical(aux) pour ces mots-clés (${MIN_CLIPS} minimum).`);
  }

  const clips: { id: string; src: string; durationSec: number; credit?: string }[] = [];
  for (const [i, candidate] of candidates.entries()) {
    await reporter.report(`Téléchargement des clips (${i + 1}/${candidates.length})…`, 15 + Math.round(((i + 1) / candidates.length) * 20));
    const rel = `clips/clip-${i + 1}.mp4`;
    const dest = path.join(publicDir, rel);
    try {
      await downloadTo(candidate.link, dest);
      const info = await probe(dest);
      if (info.duration < 1) throw new Error('clip trop court');
      clips.push({ id: `pixabay-${candidate.id}`, src: rel, durationSec: info.duration, credit: candidate.credit });
    } catch (err) {
      console.warn(`Clip ${candidate.id} ignoré : ${err instanceof Error ? err.message : err}`);
    }
  }
  if (clips.length < MIN_CLIPS) throw new Error(`Moins de ${MIN_CLIPS} clips exploitables après téléchargement.`);

  // 4. Montage
  const props = composeProps({
    targetSec,
    hook: params.hook,
    nicheName: params.niche.name,
    script: params.script,
    events: voice.events,
    audioSec: voice.audioSec,
    audioSrc: 'audio/voice.mp3',
    clips,
  });

  await reporter.report('Montage Remotion : préparation…', 36, true);
  const outFile = path.join(workDir, `${jobId}.mp4`);
  await renderViral({
    props,
    publicDir,
    outFile,
    onBundleProgress: (p) => void reporter.report(`Montage Remotion : préparation (${p} %)…`, 36 + Math.round(p * 0.08)),
    onRenderProgress: (p) => void reporter.report(`Rendu de la vidéo 1080×1920 (${p} %)…`, 45 + Math.round(p * 0.45)),
  });

  // 5. Contrôle du fichier produit
  await reporter.report('Contrôle de la vidéo…', 91, true);
  const info = await probe(outFile);
  if (info.videoCodec !== 'h264') throw new Error(`Codec inattendu : ${info.videoCodec}`);
  if (info.width !== 1080 || info.height !== 1920) throw new Error(`Dimensions inattendues : ${info.width}×${info.height}`);
  if (!info.hasAudio) throw new Error('La vidéo rendue n\'a pas de piste audio.');
  if (info.size > MAX_BYTES) throw new Error(`Vidéo trop lourde (${Math.round(info.size / 1048576)} Mo, maximum 60 Mo).`);
  if (info.duration < requested - 1) throw new Error(`Vidéo trop courte : ${info.duration.toFixed(1)} s au lieu de ${requested} s.`);

  // 6. Envoi
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
  console.log(`Terminé : ${videoUrl} (${(info.size / 1048576).toFixed(1)} Mo, ${info.duration.toFixed(1)} s)`);
}

main().catch(async (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('ÉCHEC DU RENDU :', message);
  try {
    await api.patchJob(jobId, { status: 'failed', step: 'Échec du rendu', error: message.slice(0, 480) });
  } catch (reportError) {
    console.error('Impossible de signaler l\'échec au serveur :', reportError);
  }
  process.exit(1);
});
