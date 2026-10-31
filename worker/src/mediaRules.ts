// Règles des médias personnels (pures, sans import) : types acceptés, taille, descriptions.
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
export const MAX_MEDIA_PER_USER = 40;

const TYPES: Record<string, { kind: 'image' | 'video'; ext: string }> = {
  'image/jpeg': { kind: 'image', ext: 'jpg' },
  'image/png': { kind: 'image', ext: 'png' },
  'image/webp': { kind: 'image', ext: 'webp' },
  'video/mp4': { kind: 'video', ext: 'mp4' },
  'video/quicktime': { kind: 'video', ext: 'mov' },
};

export function mediaType(mime: string): { kind: 'image' | 'video'; ext: string } | null {
  return TYPES[mime.toLowerCase().split(';')[0].trim()] ?? null;
}

export function cleanDescription(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
}
