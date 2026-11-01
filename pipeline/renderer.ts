import os from 'node:os';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, selectComposition } from '@remotion/renderer';
/** Composition Remotion à rendre : « Viral » (plans Pixabay) ou « Cartoon » (dessin animé). */
export type CompositionId = 'Viral' | 'Cartoon';

export async function renderViral(options: {
  props: object;
  composition?: CompositionId;
  publicDir: string;
  outFile: string;
  onBundleProgress?: (percent: number) => void;
  onRenderProgress?: (percent: number) => void;
}): Promise<void> {
  const entryPoint = path.resolve(import.meta.dirname, 'remotion/index.ts');

  let started = Date.now();
  await ensureBrowser();
  console.log(`[temps] navigateur prêt : ${((Date.now() - started) / 1000).toFixed(1)} s`);

  started = Date.now();
  const serveUrl = await bundle({
    entryPoint,
    publicDir: options.publicDir,
    onProgress: (progress: number) => options.onBundleProgress?.(Math.round(progress)),
  });
  console.log(`[temps] bundle Remotion : ${((Date.now() - started) / 1000).toFixed(1)} s`);

  const inputProps = options.props as unknown as Record<string, unknown>;
  const compositionId = options.composition ?? 'Viral';
  const composition = await selectComposition({ serveUrl, id: compositionId, inputProps });

  started = Date.now();
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: options.outFile,
    inputProps,
    crf: 22,
    pixelFormat: 'yuv420p',
    x264Preset: 'veryfast',
    concurrency: Math.max(2, os.cpus().length),
    audioCodec: 'aac',
    enforceAudioTrack: true,
    timeoutInMilliseconds: 180_000,
    onProgress: ({ progress }) => options.onRenderProgress?.(Math.round(progress * 100)),
  });
  console.log(`[temps] rendu image par image : ${((Date.now() - started) / 1000).toFixed(1)} s`);
}
