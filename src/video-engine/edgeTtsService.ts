// Voix off : la synthèse réelle est faite par Edge TTS sur le serveur de rendu (pipeline/tts.py).
// Ce fichier ne garde que la liste des voix proposées dans l'interface.

export interface EdgeTtsVoice {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  locale: string;
  description: string;
}

export const TIKTOK_FREE_VOICES: EdgeTtsVoice[] = [
  {
    id: 'fr-FR-VivienneMultilingualNeural',
    name: 'Vivienne (TikTok Viral Féminin)',
    gender: 'Female',
    locale: 'fr-FR',
    description: 'Voix dynamique et claire très populaire sur TikTok France',
  },
  {
    id: 'fr-FR-RemyMultilingualNeural',
    name: 'Rémy (Punchy & Narratif)',
    gender: 'Male',
    locale: 'fr-FR',
    description: 'Voix masculine énergique idéale pour le Business et la Cuisine',
  },
  {
    id: 'fr-FR-EloiseNeural',
    name: 'Éloïse (Luxe & Posé)',
    gender: 'Female',
    locale: 'fr-FR',
    description: 'Voix chic et fluide parfaite pour la Mode et la Beauté',
  },
];
