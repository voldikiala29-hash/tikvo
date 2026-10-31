import { spawn } from 'node:child_process';

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

export async function retry<T>(
  label: string,
  times: number,
  delayMs: number,
  fn: (attempt: number) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      console.warn(`[${label}] tentative ${attempt}/${times} échouée : ${err instanceof Error ? err.message : err}`);
      if (attempt < times) await sleep(delayMs * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export interface RunResult {
  stdout: string;
  stderr: string;
}

/** Lance une commande ; rejette avec la fin de stderr si le code de sortie n'est pas 0. */
export function run(command: string, args: string[], options: { cwd?: string } = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    child.on('error', (err) => reject(new Error(`${command} : ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} a échoué (code ${code}) : ${(stderr || stdout).trim().slice(-600)}`));
    });
  });
}

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  videoCodec: string;
  fps: number;
  hasAudio: boolean;
  size: number;
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
}

export async function probe(file: string): Promise<ProbeResult> {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    file,
  ]);
  const data = JSON.parse(stdout) as { streams?: FfprobeStream[]; format?: { duration?: string; size?: string } };
  const video = data.streams?.find((s) => s.codec_type === 'video');
  const audio = data.streams?.find((s) => s.codec_type === 'audio');
  const [num, den] = (video?.r_frame_rate || '0/1').split('/').map(Number);
  return {
    duration: Number(data.format?.duration || 0),
    width: video?.width || 0,
    height: video?.height || 0,
    videoCodec: video?.codec_name || '',
    fps: den ? num / den : 0,
    hasAudio: Boolean(audio),
    size: Number(data.format?.size || 0),
  };
}

export interface JobPatch {
  status?: string;
  step?: string;
  progress?: number;
  videoUrl?: string;
  videoBytes?: number;
  durationSec?: number;
  error?: string | null;
  publish?: {
    publishId?: string;
    tiktokStatus?: string;
    postIds?: string[];
    error?: string | null;
  };
}

export interface JobData {
  id: string;
  status: string;
  params: {
    niche?: { id: string; name: string };
    hook?: string;
    script?: string;
    keywords?: string[];
    voice?: string;
    pexelsIds?: number[];
    duration?: number;
    branding?: unknown;
    settings?: unknown;
  };
  publish: {
    caption?: string;
    privacy?: string;
    disableComment?: boolean;
    disableDuet?: boolean;
    disableStitch?: boolean;
    brandContent?: boolean;
    brandOrganic?: boolean;
    isAigc?: boolean;
  };
  videoUrl: string | null;
}

/** Client des routes internes du Worker (authentifiées par RENDER_SECRET). */
export class WorkerApi {
  base: string;
  secret: string;

  constructor(base: string, secret: string) {
    this.base = base.replace(/\/+$/, '');
    this.secret = secret;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return retry(`worker ${method} ${path}`, 3, 1500, async () => {
      const res = await fetch(`${this.base}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.secret}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Worker ${method} ${path} → HTTP ${res.status}`);
      return (await res.json()) as T;
    });
  }

  getJob(id: string): Promise<JobData> {
    return this.request<JobData>('GET', `/internal/jobs/${id}`);
  }

  patchJob(id: string, patch: JobPatch): Promise<unknown> {
    return this.request('POST', `/internal/jobs/${id}`, patch);
  }

  async getToken(id: string): Promise<string> {
    const data = await this.request<{ accessToken: string }>('GET', `/internal/jobs/${id}/token`);
    return data.accessToken;
  }
}

/** Envoie la progression au plus toutes les 4 s (sauf si forcé), pour ménager les écritures D1. */
export class ProgressReporter {
  api: WorkerApi;
  jobId: string;
  status: string;
  lastSent = 0;

  constructor(api: WorkerApi, jobId: string, status: string) {
    this.api = api;
    this.jobId = jobId;
    this.status = status;
  }

  async report(step: string, progress: number, force = false): Promise<void> {
    const t = Date.now();
    if (!force && t - this.lastSent < 4000) return;
    this.lastSent = t;
    try {
      await this.api.patchJob(this.jobId, { status: this.status, step, progress });
    } catch (err) {
      console.warn('Progression non envoyée :', err instanceof Error ? err.message : err);
    }
  }
}
