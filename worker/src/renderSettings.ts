// Réglages de rendu (copie validée côté Worker, sans import). Mêmes identifiants que src/video-engine/montage.ts.
export const ASPECT_IDS = ['9:16', '16:9', '1:1', '4:5'] as const;
export const MONTAGE_IDS = ['dynamique', 'cinema', 'pop', 'minimal', 'documentaire', 'story'] as const;
export const CLIP_CHOICES = [0, 2, 3, 5, 8] as const;

export interface RenderSettings {
  aspect: string;
  montage: string;
  clipsPerScript: number;
}

export const DEFAULT_SETTINGS: RenderSettings = { aspect: '9:16', montage: 'dynamique', clipsPerScript: 0 };

export function resolveRenderSettings(raw: unknown): RenderSettings {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const aspect = (ASPECT_IDS as readonly string[]).includes(o.aspect as string) ? (o.aspect as string) : DEFAULT_SETTINGS.aspect;
  const montage = (MONTAGE_IDS as readonly string[]).includes(o.montage as string) ? (o.montage as string) : DEFAULT_SETTINGS.montage;
  const clips = (CLIP_CHOICES as readonly number[]).includes(Number(o.clipsPerScript))
    ? Number(o.clipsPerScript)
    : DEFAULT_SETTINGS.clipsPerScript;
  return { aspect, montage, clipsPerScript: clips };
}
