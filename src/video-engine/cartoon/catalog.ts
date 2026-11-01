// Catalogue du style dessin animé : personnages originaux et décors.
// Données pures, partagées entre le site (choix du personnage) et le moteur de rendu.

export type Expression = 'neutre' | 'content' | 'colere' | 'triste' | 'surpris';
export type HairStyle = 'court' | 'frange' | 'chignon' | 'herisse' | 'gris';
/** Rôle dans la scène : le personnage principal, ou un personnage secondaire de ce rôle. */
export type Role = 'employe' | 'patron' | 'collegue' | 'rh';
export type SetId = 'bureau' | 'couloir' | 'salle-reunion' | 'exterieur';

export interface CharacterLook {
  id: string;
  name: string;
  role: Role;
  hair: HairStyle;
  hairColor: string;
  shirt: string;
  tie?: string;
  glasses?: boolean;
  skin: string;
}

export const CHARACTERS: readonly CharacterLook[] = [
  { id: 'employe', name: 'Employé', role: 'employe', hair: 'court', hairColor: '#2B2B2B', shirt: '#E6EEF8', tie: '#D62B2B', skin: '#FFFFFF' },
  { id: 'patron', name: 'Patron', role: 'patron', hair: 'gris', hairColor: '#8E9399', shirt: '#1F2F4D', tie: '#D62B2B', skin: '#FFFFFF' },
  { id: 'collegue', name: 'Collègue', role: 'collegue', hair: 'chignon', hairColor: '#2B2B2B', shirt: '#7A4FB8', skin: '#FFFFFF' },
  { id: 'stagiaire', name: 'Stagiaire', role: 'collegue', hair: 'herisse', hairColor: '#1A1A1A', shirt: '#F2F2F2', tie: '#2D7DD2', glasses: true, skin: '#FFFFFF' },
  { id: 'drh', name: 'DRH', role: 'rh', hair: 'frange', hairColor: '#6B3E2A', shirt: '#2E7D4F', skin: '#FFFFFF' },
];

export const DEFAULT_MAIN_CHARACTER = 'employe';

export const SETS: readonly { id: SetId; label: string }[] = [
  { id: 'bureau', label: 'Bureau' },
  { id: 'couloir', label: 'Couloir' },
  { id: 'salle-reunion', label: 'Salle de réunion' },
  { id: 'exterieur', label: 'Extérieur' },
];

export const EXPRESSIONS: readonly Expression[] = ['neutre', 'content', 'colere', 'triste', 'surpris'];

/** Personnage du catalogue par identifiant, ou le principal par défaut si l'identifiant est inconnu. */
export function characterById(id: string | undefined | null): CharacterLook {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
