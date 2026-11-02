// Voix off : la synthèse réelle est faite par Edge TTS sur le serveur de rendu (pipeline/tts.py).
// Ce fichier ne garde que la liste des voix proposées dans l'interface.

export interface EdgeTtsVoice {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  locale: string;
  description: string;
}

export const FREE_VOICES: EdgeTtsVoice[] = [
  {
    id: 'fr-FR-VivienneMultilingualNeural',
    name: 'Vivienne (Viral féminin)',
    gender: 'Female',
    locale: 'fr-FR',
    description: 'Voix dynamique et claire, pour les vidéos courtes',
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
