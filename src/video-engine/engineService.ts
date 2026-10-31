// Moteur vidéo côté navigateur : prépare l'aperçu, et délègue le vrai rendu au serveur.
import { backend, JobView } from '../services/backendApi';
import { fetchPreviewClips } from './pexelsService';
import { estimateWords, FPS, hookFramesFor } from './timeline';
import type { ViralTemplateProps, VideoClip, VideoGenerationRequest } from './types';

export interface VideoGenerationResult {
  success: true;
  videoUrl: string;
  duration: number;
  renderId: string;
  fps: number;
  resolution: string;
}

const POLL_MS = 3000;
const RENDER_TIMEOUT_MS = 15 * 60_000;
const PREVIEW_HOOK_FRAMES = 90;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Interroge le serveur jusqu'à ce que `done` soit vrai. */
export async function waitForJob(
  id: string,
  done: (job: JobView) => boolean,
  onTick: ((job: JobView) => void) | undefined,
  timeoutMs: number,
): Promise<JobView> {
  const started = Date.now();
  for (;;) {
    const job = await backend.getJob(id);
    onTick?.(job);
    if (done(job)) return job;
    if (Date.now() - started > timeoutMs) {
      throw new Error('Délai dépassé : le serveur met trop de temps. Réessaie plus tard.');
    }
    await sleep(POLL_MS);
  }
}

class VideoEngineService {
  /** Aperçu : clips Pexels réels (si connecté) et sous-titres estimés. Aucune vidéo factice. */
  async prepareRemotionProps(
    nicheId: string,
    nicheName: string,
    hook: string,
    scriptText: string,
    keywords: string[] = [],
  ): Promise<{ props: ViralTemplateProps; clips: VideoClip[]; karaokeWords: ReturnType<typeof estimateWords> }> {
    const clips = await fetchPreviewClips(nicheId, keywords);
    const karaokeWords = estimateWords(scriptText, PREVIEW_HOOK_FRAMES, FPS);
    const lastFrame = karaokeWords.length > 0 ? karaokeWords[karaokeWords.length - 1].endFrame : 0;
    const totalDurationInFrames = Math.min(180 * FPS, Math.max(5 * FPS, lastFrame + Math.round(0.8 * FPS)));

    const props: ViralTemplateProps = {
      hookText: hook,
      nicheName,
      clips,
      karaokeWords,
      totalDurationInFrames,
      hookFrames: hookFramesFor(hook, karaokeWords),
      brandTag: 'tikvo',
    };
    return { props, clips, karaokeWords };
  }

  /** Vrai rendu : voix off, clips, montage 1080×1920, faits sur le serveur de rendu. */
  async generateVideo(
    request: VideoGenerationRequest,
    onProgress?: (step: string, percentage: number) => void,
  ): Promise<VideoGenerationResult> {
    onProgress?.('Envoi de la demande au serveur…', 3);
    const job = await backend.createJob({
      niche: request.niche,
      hook: request.hook,
      script: request.script,
      keywords: request.keywords,
      voice: request.voice,
      pexelsIds: request.pexelsIds,
    });

    const done = await waitForJob(
      job.id,
      (j) => j.status === 'rendered' || j.status === 'failed',
      (j) => onProgress?.(j.step || 'Rendu en cours…', Math.max(5, j.progress)),
      RENDER_TIMEOUT_MS,
    );
    if (done.status === 'failed' || !done.videoUrl) {
      throw new Error(done.error || 'Le rendu a échoué.');
    }

    onProgress?.('Vidéo prête', 100);
    return {
      success: true,
      videoUrl: done.videoUrl,
      duration: done.durationSec ?? 0,
      renderId: done.id,
      fps: 30,
      resolution: '1080x1920',
    };
  }

}

export const videoEngineService = new VideoEngineService();
