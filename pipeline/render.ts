// Rendu réel d'une vidéo tikvo, exécuté par GitHub Actions (workflow render-video.yml).
// Voix off MeloTTS (Workers AI, repli gTTS) → clips Pixabay (en parallèle) → montage Remotion aux dimensions choisies → release GitHub.
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { composeProps, MAX_VIDEO_SECONDS, TAIL_SECONDS, resolveBranding } from './compose.ts';
import { ProgressReporter, WorkerApi, probe, requireEnv, run } from './lib.ts';
import { cartoonVideoProps } from '../src/video-engine/cartoon/props.ts';
import { heroVoice, placeSpoken, type SpokenItem } from '../src/video-engine/cartoon/dialogue.ts';
import { storyCartoonProps } from '../src/video-engine/cartoon/storyProps.ts';
import { hookFramesFor } from '../src/video-engine/timeline.ts';
import type { Story } from '../src/video-engine/story.ts';
import { directScene } from '../src/video-engine/cartoon/direction.ts';
import { DEFAULT_MAIN_CHARACTER } from '../src/video-engine/cartoon/catalog.ts';
import { buildQueries, collectClips, downloadTo } from './stock.ts';
import type { ClipCandidate } from './stock.ts';
import { findSceneClips, userSceneClips } from './sceneClips.ts';
import { mergeDropped, sceneWindows, shotWindows, splitScenes } from './scenes.ts';
import type { SceneClip, SceneWindow } from './scenes.ts';
import { FPS, alignedWords } from '../src/video-engine/timeline.ts';
import { renderViral, type CompositionId } from './renderer.ts';
import type { JobData } from './lib.ts';
import { synthesizeVoice } from './tts.ts';
import { resolveVoice, voiceLabel } from '../src/video-engine/voices.ts';
import { aspectSize, clipCountFor, resolveRenderSettings } from '../src/video-engine/montage.ts';
import { planShotSeconds, type Shot } from '../src/video-engine/storyboard.ts';

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
/** Télécharge les plans (dans l'ordre, 4 à la fois). Un plan qui échoue donne null. */
async function downloadClips(items: (ClipCandidate | null)[], publicDir: string, reporter: ProgressReporter): Promise<(SceneClip | null)[]> {
  const total = items.filter((c) => c !== null).length;
  let done = 0;
  return mapLimit(items, DOWNLOAD_PARALLEL, async (candidate, i) => {
    if (!candidate) return null;
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
      done++;
      await reporter.report(`Téléchargement des plans (${done}/${total})…`, 15 + Math.round((done / Math.max(1, total)) * 20));
    }
  });
}

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

/**
 * Rendu d'une histoire : une voix par héros (et une pour le narrateur), une piste audio par réplique,
 * scènes calées sur la voix, puis montage « Cartoon ». Les contrôles et l'envoi suivent le même chemin que les autres rendus.
 */
async function renderStoryJob(options: {
  story: Story;
  params: JobData['params'];
  settings: ReturnType<typeof resolveRenderSettings>;
  workDir: string;
  publicDir: string;
}): Promise<void> {
  const { story, params, settings, workDir, publicDir } = options;
  const size = aspectSize(settings.aspect);
  const narratorVoice = resolveVoice(params.niche?.id, settings.voice, settings.voiceStyle);

  // Une réplique = une piste audio, dans l'ordre des scènes : narration d'abord, puis répliques.
  const jobs: { speaker: string; sceneIndex: number; text: string; expression: string; voice: string; rate?: string; pitch?: string }[] = [];
  story.scenes.forEach((scene, sceneIndex) => {
    if (scene.narration) {
      jobs.push({ speaker: 'narrator', sceneIndex, text: scene.narration, expression: 'neutre', voice: narratorVoice.voice, rate: narratorVoice.rate, pitch: narratorVoice.pitch });
    }
    for (const line of scene.lines) {
      if (line.speaker === 'narrator') {
        jobs.push({ speaker: 'narrator', sceneIndex, text: line.text, expression: 'neutre', voice: narratorVoice.voice, rate: narratorVoice.rate, pitch: narratorVoice.pitch });
        continue;
      }
      const idx = story.characters.findIndex((c) => c.id === line.speaker);
      const hv = heroVoice(story.characters[idx], idx);
      jobs.push({ speaker: line.speaker, sceneIndex, text: line.text, expression: line.expression, voice: hv.voice, rate: hv.rate, pitch: hv.pitch });
    }
  });
  if (jobs.length === 0) throw new Error("L'histoire n'a aucune réplique.");

  const items: SpokenItem[] = [];
  const audioFiles: string[] = [];
  const engines = new Set<string>();
  for (let k = 0; k < jobs.length; k++) {
    const job = jobs[k];
    const rel = `audio/line-${k + 1}.mp3`;
    await reporter.report(`Voix : réplique ${k + 1}/${jobs.length}…`, 5 + Math.round((k / jobs.length) * 10), true);
    const voice = await synthesizeVoice({
      text: job.text,
      voice: job.voice,
      rate: job.rate,
      pitch: job.pitch,
      workDir,
      audioFile: path.join(publicDir, rel),
      api,
      jobId,
    });
    engines.add(voice.engine);
    items.push({ speaker: job.speaker, sceneIndex: job.sceneIndex, text: job.text, expression: job.expression, audioSec: voice.audioSec, events: voice.events });
    audioFiles.push(rel);
  }

  const timeline = placeSpoken(items, story.scenes.map((s) => s.seconds));
  const totalSec = timeline.totalFrames / FPS;
  if (totalSec > MAX_VIDEO_SECONDS) throw new Error(`L'histoire durerait ${Math.round(totalSec)} s : raccourcis-la (maximum ${MAX_VIDEO_SECONDS} s).`);
  console.log(`[histoire] ${jobs.length} répliques, ${totalSec.toFixed(1)} s, moteurs : ${[...engines].join(', ')}`);
  lap('voix des héros');

  const karaokeWords = timeline.items.flatMap((it) => it.words);
  const branding = resolveBranding(params.branding);
  const props = storyCartoonProps({
    story,
    timeline,
    audioFiles,
    hook: params.hook ?? story.hook,
    nicheName: params.niche?.name ?? '',
    brandTag: branding.showBrand ? branding.brandName : undefined,
    width: size.width,
    height: size.height,
    showNiche: branding.showNiche,
    showProgress: branding.showProgress,
    hookFrames: hookFramesFor(story.hook, karaokeWords),
    karaokeWords,
  });

  await reporter.report('Montage Remotion : préparation…', 36, true);
  const outFile = path.join(workDir, `${jobId}.mp4`);
  await renderViral({
    props,
    composition: 'Cartoon',
    publicDir,
    outFile,
    onBundleProgress: (p) => void reporter.report(`Montage Remotion : préparation (${p} %)…`, 36 + Math.round(p * 0.08)),
    onRenderProgress: (p) => void reporter.report(`Rendu ${size.width}×${size.height} (${p} %)…`, 45 + Math.round(p * 0.45)),
  });

  lap('montage terminé');
  await reporter.report('Contrôle de la vidéo…', 91, true);
  const info = await probe(outFile);
  if (info.videoCodec !== 'h264') throw new Error(`Codec inattendu : ${info.videoCodec}`);
  if (info.width !== size.width || info.height !== size.height) {
    throw new Error(`Dimensions inattendues : ${info.width}×${info.height} (attendu ${size.width}×${size.height})`);
  }
  if (!info.hasAudio) throw new Error("La vidéo rendue n'a pas de piste audio.");
  if (info.size > MAX_BYTES) throw new Error(`Vidéo trop lourde (${Math.round(info.size / 1048576)} Mo, maximum 60 Mo).`);

  await reporter.report('Envoi de la vidéo…', 94, true);
  const videoUrl = await uploadRelease(outFile, `${jobId}.mp4`);
  await pruneOldAssets();
  const voiceNote = `Voix: ${[...engines].join(' + ')} · histoire (${story.characters.length} héros)`;
  await api.patchJob(jobId, {
    status: 'rendered',
    step: `Vidéo prête · ${voiceNote}`,
    progress: 100,
    videoUrl,
    videoBytes: info.size,
    durationSec: Math.round(info.duration * 10) / 10,
    error: null,
  });
  console.log(`Terminé : ${videoUrl} (${(info.size / 1048576).toFixed(1)} Mo, ${info.duration.toFixed(1)} s, ${size.width}×${size.height})`);
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

  if (params.story) {
    await renderStoryJob({ story: params.story as Story, params, settings, workDir, publicDir });
    return;
  }

  let voiceNote = '';
  // Durées par étape, lues dans les journaux GitHub Actions pour cibler les lenteurs.
  const t0 = Date.now();
  const lap = (label: string) => console.log(`[temps] ${label} : ${((Date.now() - t0) / 1000).toFixed(1)} s depuis le début`);

  // 1. Voix off : c'est elle qui fixe la durée de la vidéo.
  // 0. Script amélioré : c'est lui qui est lu, sous-titré et cherché sur Pixabay. Repli : le script d'origine.
  await reporter.report('Amélioration du script…', 3, true);
  const improvement = await api
    .improveScript(params.script, params.niche.id)
    .catch(() => ({ script: params.script, improved: false }));
  const script = improvement.script;

  await reporter.report('Synthèse de la voix off (Edge TTS, puis MeloTTS en secours)…', 5, true);
  // Voix et style propres à la niche, sauf choix explicite pour ce rendu. MeloTTS n'a qu'une voix par langue :
  // seuls les réglages ne s'appliquent qu'au moteur de secours (gTTS ne règle ni voix ni vitesse).
  const chosen = resolveVoice(params.niche.id, settings.voice, settings.voiceStyle);
  const voice = await synthesizeVoice({
    text: script,
    voice: chosen.voice,
    rate: chosen.rate,
    pitch: chosen.pitch,
    workDir,
    audioFile: path.join(publicDir, 'audio', 'voice.mp3'),
    api,
    jobId,
  });
  console.log(`Voix : ${chosen.voice} (${chosen.style}), ${voice.audioSec.toFixed(1)} s, moteur ${voice.engine}, événements ${voice.kind} (${voice.events.length})`);
  // Dans la carte : quelle voix a réellement parlé, et si les sous-titres suivent chaque mot.
  voiceNote = voice.engine === 'edge'
    ? 'Voix: Edge TTS (timings précis)'
    : voice.engine === 'melotts'
      ? 'Voix: MeloTTS (répartition)'
      : 'Voix: gTTS (répartition)';
  if (voice.engine !== 'edge') {
    await reporter.report(`${voiceNote} : Edge TTS indisponible, sous-titres répartis sur la durée`, 12, true);
  }
  if (improvement.improved) voiceNote = `${voiceNote} · script amélioré`;
  if (voice.audioSec + TAIL_SECONDS > MAX_VIDEO_SECONDS) {
    throw new Error(`La voix dure ${Math.round(voice.audioSec)} s : raccourcis le script (maximum ${MAX_VIDEO_SECONDS - 1} s).`);
  }
  const totalSec = voice.audioSec + TAIL_SECONDS;

  lap('voix off');

  let props: object;
  let compositionId: CompositionId = 'Viral';
  if (params.style === 'cartoon') {
    // 2. Dessin animé : décors et personnages dessinés, sans recherche Pixabay.
    await reporter.report('Mise en scène du dessin animé…', 20, true);
    const shots: Shot[] | null = params.storyboard?.length ? params.storyboard : null;
    const lines = shots ? shots.map((s) => s.text) : splitScenes(script);
    const directions = lines.map(directScene);
    const totalFrames = Math.ceil(totalSec * FPS);
    const windows = shots
      ? shotWindows(planShotSeconds(shots, totalSec), shots.map(() => Number.POSITIVE_INFINITY), totalFrames, FPS).windows
      : sceneWindows(lines, alignedWords(voice.events, script, voice.audioSec), totalFrames);
    const branding = resolveBranding(params.branding);
    const size = aspectSize(settings.aspect);
    props = cartoonVideoProps({
      hook: params.hook,
      nicheName: params.niche.name,
      script,
      events: voice.events,
      audioSec: voice.audioSec,
      audioSrc: 'audio/voice.mp3',
      directions,
      windows,
      mainCharacter: params.mainCharacter ?? DEFAULT_MAIN_CHARACTER,
      showNiche: branding.showNiche,
      showProgress: branding.showProgress,
      brandTag: branding.showBrand ? branding.brandName : undefined,
      width: size.width,
      height: size.height,
    });
    compositionId = 'Cartoon';
    voiceNote = voiceNote ? `${voiceNote} · dessin animé` : 'dessin animé';
  } else {
    // 2. Plans. Storyboard fourni : ce sont les plans de l'utilisateur, dans son ordre.
    // Sinon, priorité au script : une recherche par phrase, pour que l'image suive ce qui est dit.
    const pixabayKey = requireEnv('PEXELS_API_KEY'); // nom du secret conservé pendant la transition
    const shots: Shot[] | null = params.storyboard?.length ? params.storyboard : null;
    const lines = shots ? shots.map((s) => s.text) : splitScenes(script);
    const shotSeconds = shots ? planShotSeconds(shots, totalSec) : null;
    const plan = await api
      .briefs(lines, params.niche.id, params.media ?? [], script)
      .catch((err: unknown) => {
        console.warn('Plans par phrase indisponibles, recherche par niche :', err instanceof Error ? err.message : err);
        return null;
      });
    const queries = plan?.queries ?? null;
    const mediaIds = plan?.mediaIds ?? lines.map(() => null);

    let clips: SceneClip[];
    let scenes: SceneWindow[] | undefined;
    if (queries && (queries.some((q) => q !== null) || mediaIds.some((m) => m !== null))) {
      await reporter.report(`Choix des plans pour ${lines.length} ${shots ? 'plans' : 'phrases'}…`, 15, true);
      // Photos et vidéos personnelles là où elles montrent exactement la phrase ; Pixabay pour les autres.
      const own = await userSceneClips(api, mediaIds, params.media ?? [], publicDir);
      const found = await findSceneClips({
        queries: queries.map((q, i) => (own[i] ? null : q)),
        key: pixabayKey,
        seed: params.variant ?? 0,
        fallbackQueries: buildQueries(params.niche.id, params.keywords || []),
        minSeconds: shotSeconds ?? undefined,
      });
      lap('recherche des plans');
      const got = await downloadClips(found, publicDir, reporter);
      const perScene = lines.map((_, i) => own[i] ?? got[i]);
      const precise = perScene.filter((c) => c !== null).length;
      console.log(`[plans] ${precise}/${lines.length} ${shots ? 'plans du storyboard' : 'phrases'} avec un plan qui correspond`);
      await reporter.report(`${precise}/${lines.length} ${shots ? 'plans' : 'phrases'} illustrés par un plan précis`, 20, true);
      if (shots && shotSeconds) {
        // Durées réelles des clips : un plan trop court se termine plus tôt, le temps passe au suivant.
        const sb = shotWindows(
          shotSeconds,
          perScene.map((c) => (c ? (c.kind === 'image' ? Number.POSITIVE_INFINITY : c.durationSec) : null)),
          Math.ceil(totalSec * FPS),
          FPS,
        );
        clips = sb.kept.map((i) => perScene[i]).filter((c): c is SceneClip => c !== null);
        scenes = sb.windows;
        voiceNote = voiceNote ? `${voiceNote} · storyboard` : 'storyboard';
      } else {
        clips = perScene.filter((c): c is SceneClip => c !== null);
        const timing = alignedWords(voice.events, script, voice.audioSec);
        scenes = mergeDropped(sceneWindows(lines, timing, Math.ceil(totalSec * FPS)), perScene.map((c) => c !== null)).windows;
      }
      if (clips.length < MIN_CLIPS) throw new Error(`Moins de ${MIN_CLIPS} plans exploitables après téléchargement.`);
    } else {
      // Repli : recherche générique par niche, nombre de plans selon la durée.
      const need = clipCountFor(totalSec, settings.clipsPerScript);
      await reporter.report(`Recherche de ${need} plans Pixabay…`, 15, true);
      const candidates = await collectClips({
        need,
        ids: params.pexelsIds || [],
        queries: buildQueries(params.niche.id, params.keywords || []),
        key: pixabayKey,
        seed: params.variant ?? 0,
      });
      if (candidates.length < Math.min(MIN_CLIPS, need)) {
        throw new Error(`Pixabay n'a trouvé que ${candidates.length} clip(s) vertical(aux) pour ces mots-clés.`);
      }
      const got = await downloadClips(candidates, publicDir, reporter);
      clips = got.filter((c): c is SceneClip => c !== null);
      if (clips.length < Math.min(MIN_CLIPS, need)) throw new Error(`Moins de ${MIN_CLIPS} plans exploitables après téléchargement.`);
    }

    // 3. Montage aux dimensions et avec le style choisis.
    props = composeProps({
    hook: params.hook,
    nicheName: params.niche.name,
    script,
    events: voice.events,
    audioSec: voice.audioSec,
    audioSrc: 'audio/voice.mp3',
    clips,
    scenes,
    branding: resolveBranding(params.branding),
    settings,
  });
  }

  await reporter.report('Montage Remotion : préparation…', 36, true);
  const outFile = path.join(workDir, `${jobId}.mp4`);
  await renderViral({
    props,
    composition: compositionId,
    publicDir,
    outFile,
    onBundleProgress: (p) => void reporter.report(`Montage Remotion : préparation (${p} %)…`, 36 + Math.round(p * 0.08)),
    onRenderProgress: (p) => void reporter.report(`Rendu ${size.width}×${size.height} (${p} %)…`, 45 + Math.round(p * 0.45)),
  });

  // 4. Contrôle du fichier produit
  lap('montage terminé');
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
    step: voiceNote ? `Vidéo prête · ${voiceNote}` : 'Vidéo prête',
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
