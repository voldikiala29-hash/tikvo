import os from 'node:os';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, selectComposition } from '@remotion/renderer';
import type { ViralTemplateProps } from '../src/video-engine/types.ts';

export async function renderViral(options: {
  props: ViralTemplateProps;
  publicDir: string;
  outFile: string;
  onBundleProgress?: (percent: number) => void;
  onRenderProgress?: (percent: number) => void;
}): Promise<void> {
  const entryPoint = path.resolve(import.meta.dirname, 'remotion/index.ts');

  await ensureBrowser();

  const serveUrl = await bundle({
    entryPoint,
    publicDir: options.publicDir,
    onProgress: (progress: number) => options.onBundleProgress?.(Math.round(progress)),
  });

  const inputProps = options.props as unknown as Record<string, unknown>;
  const composition = await selectComposition({ serveUrl, id: 'Viral', inputProps });

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
}
