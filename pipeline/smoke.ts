// Test de bout en bout du rendu SANS Pixabay ni Worker : vraie voix Edge TTS + vrai rendu Remotion
// sur des plans synthétiques générés par ffmpeg. Lancé par la CI (job "pipeline-smoke").
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { composeProps } from './compose.ts';
import { probe, run } from './lib.ts';
import { renderViral } from './renderer.ts';
import { synthesizeVoice } from './tts.ts';

const SCRIPT =
  "Arrête d'acheter cinquante pantalons. Voici trois tenues d'élite avec une seule pièce. " +
  'Regarde bien cette astuce : change ce réglage et combine ces deux étapes. Abonne-toi pour la suite !';

async function main(): Promise<void> {
  const workDir = path.resolve('work-smoke');
  const publicDir = path.join(workDir, 'public');
  await rm(workDir, { recursive: true, force: true });
  await mkdir(path.join(publicDir, 'clips'), { recursive: true });
  await mkdir(path.join(publicDir, 'audio'), { recursive: true });

  const voice = await synthesizeVoice({
    text: SCRIPT,
    voice: 'fr-FR-VivienneMultilingualNeural',
    workDir,
    audioFile: path.join(publicDir, 'audio', 'voice.mp3'),
  });
  console.log(`Voix : ${voice.audioSec.toFixed(1)} s, événements ${voice.kind} (${voice.events.length})`);

  const sources = ['testsrc2', 'smptebars', 'mandelbrot'];
  const clips: { id: string; src: string; durationSec: number }[] = [];
  for (const [i, source] of sources.entries()) {
    const rel = `clips/clip-${i + 1}.mp4`;
    await run('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', `${source}=size=1080x1920:rate=30`,
      '-t', '6', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'veryfast',
      path.join(publicDir, rel),
    ]);
    clips.push({ id: `synthetic-${i + 1}`, src: rel, durationSec: 6 });
  }

  const props = composeProps({
    hook: "Arrête d'acheter cinquante pantalons",
    nicheName: 'Mode',
    script: SCRIPT,
    events: voice.events,
    audioSec: voice.audioSec,
    audioSrc: 'audio/voice.mp3',
    clips,
  });

  const outFile = path.join(workDir, 'smoke.mp4');
  let last = -1;
  await renderViral({
    props,
    publicDir,
    outFile,
    onRenderProgress: (p) => {
      if (p % 20 === 0 && p !== last) {
        last = p;
        console.log(`Rendu ${p} %`);
      }
    },
  });

  const info = await probe(outFile);
  console.log(JSON.stringify(info));
  const expected = props.totalDurationInFrames / 30;
  if (info.videoCodec !== 'h264') throw new Error(`codec ${info.videoCodec}`);
  if (info.width !== 1080 || info.height !== 1920) throw new Error(`dimensions ${info.width}x${info.height}`);
  if (!info.hasAudio) throw new Error('pas de piste audio');
  if (Math.abs(info.duration - expected) > 1) throw new Error(`durée ${info.duration} au lieu de ${expected}`);
  if (info.size < 50_000) throw new Error('fichier suspect (trop petit)');
  console.log('SMOKE OK');
}

main().catch((err) => {
  console.error('SMOKE ÉCHEC :', err instanceof Error ? err.message : err);
  process.exit(1);
});
