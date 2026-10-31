// Copie de src/video-engine/voices.ts (même contenu, vérifié par les tests).
// Aucun import à l'exécution : ce fichier doit rester utilisable tel quel par les tests Node.

export const VOICES = [
  { id: 'fr-FR-VivienneMultilingualNeural', label: 'Vivienne', gender: 'Femme', note: 'Claire et moderne' },
  { id: 'fr-FR-RemyMultilingualNeural', label: 'Rémy', gender: 'Homme', note: 'Jeune et vif' },
  { id: 'fr-FR-DeniseNeural', label: 'Denise', gender: 'Femme', note: 'Chaleureuse' },
  { id: 'fr-FR-HenriNeural', label: 'Henri', gender: 'Homme', note: 'Sérieux et posé' },
  { id: 'fr-FR-EloiseNeural', label: 'Éloïse', gender: 'Femme', note: 'Enjouée' },
  { id: 'fr-FR-AlainNeural', label: 'Alain', gender: 'Homme', note: 'Grave et assuré' },
  { id: 'fr-FR-JeanNeural', label: 'Jean', gender: 'Homme', note: 'Calme et pédagogique' },
  { id: 'fr-FR-YvetteNeural', label: 'Yvette', gender: 'Femme', note: 'Mûre et posée' },
] as const;

/** Style = débit et hauteur de la voix (SSML via edge-tts). */
export const VOICE_STYLES = [
  { id: 'naturel', label: 'Naturel', rate: '+6%', pitch: '+0Hz' },
  { id: 'dynamique', label: 'Dynamique', rate: '+12%', pitch: '+2Hz' },
  { id: 'energique', label: 'Énergique', rate: '+18%', pitch: '+4Hz' },
  { id: 'pose', label: 'Posé', rate: '+0%', pitch: '-2Hz' },
  { id: 'autorite', label: 'Autorité', rate: '+2%', pitch: '-5Hz' },
] as const;

/** Voix et style par défaut de chaque niche : chaque niche a sa propre voix. */
export const NICHE_VOICE: Record<string, { voice: string; style: string }> = {
  mode: { voice: 'fr-FR-VivienneMultilingualNeural', style: 'dynamique' },
  fitness: { voice: 'fr-FR-AlainNeural', style: 'energique' },
  business: { voice: 'fr-FR-HenriNeural', style: 'autorite' },
  crypto: { voice: 'fr-FR-AlainNeural', style: 'pose' },
  motivation: { voice: 'fr-FR-RemyMultilingualNeural', style: 'energique' },
  cuisine: { voice: 'fr-FR-DeniseNeural', style: 'naturel' },
  voyage: { voice: 'fr-FR-EloiseNeural', style: 'dynamique' },
  tech: { voice: 'fr-FR-JeanNeural', style: 'naturel' },
  beaute: { voice: 'fr-FR-YvetteNeural', style: 'pose' },
  musique: { voice: 'fr-FR-RemyMultilingualNeural', style: 'dynamique' },
  sport: { voice: 'fr-FR-HenriNeural', style: 'energique' },
  humour: { voice: 'fr-FR-EloiseNeural', style: 'energique' },
};

export const FALLBACK_VOICE = 'fr-FR-VivienneMultilingualNeural';
export const FALLBACK_STYLE = 'naturel';

export interface ResolvedVoice {
  voice: string;
  style: string;
  rate: string;
  pitch: string;
}

/**
 * Voix finale d'un rendu : la voix choisie si elle existe, sinon celle de la niche,
 * sinon la voix par défaut. Même logique pour le style.
 */
export function resolveVoice(nicheId: string | null | undefined, voice?: unknown, style?: unknown): ResolvedVoice {
  const niche = (nicheId && NICHE_VOICE[nicheId]) || { voice: FALLBACK_VOICE, style: FALLBACK_STYLE };
  const voiceId = VOICES.find((v) => v.id === voice)?.id ?? niche.voice ?? FALLBACK_VOICE;
  const styleId = VOICE_STYLES.find((s) => s.id === style)?.id ?? niche.style ?? FALLBACK_STYLE;
  const s = VOICE_STYLES.find((x) => x.id === styleId) ?? VOICE_STYLES[0];
  return { voice: voiceId, style: styleId, rate: s.rate, pitch: s.pitch };
}
