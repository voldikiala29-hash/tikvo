// Lecture de la sortie du modèle pour le template reel : validation stricte, rien d'inventé.
import { extractJsonObject } from '../story.ts';
import { SKILL_GRID_SIZE, type ReelProps } from './props.ts';

/** Valide la sortie du modèle et la ramène aux props du template (voix off vide : générée par le pipeline). */
export function parseReel(raw: string): ReelProps {
  const data = extractJsonObject(raw) as Record<string, unknown>;
  const str = (v: unknown, min: number, max: number): string => {
    if (typeof v !== 'string') throw new Error('champ texte attendu');
    const t = v.trim();
    if (t.length < min || t.length > max) throw new Error(`longueur hors limites : « ${t.slice(0, 20)} »`);
    return t;
  };
  if (!Array.isArray(data.priceItems) || data.priceItems.length < 1 || data.priceItems.length > 5) throw new Error('priceItems');
  const priceItems = data.priceItems.map((item) => {
    const i = item as { name?: unknown; price?: unknown };
    if (!Number.isInteger(i.price) || (i.price as number) < 0 || (i.price as number) > 999) throw new Error('prix');
    return { name: str(i.name, 1, 40), price: i.price as number };
  });
  const ctaKeyword = str(data.ctaKeyword, 4, 10);
  if (!/^[A-Z]+$/.test(ctaKeyword)) throw new Error('ctaKeyword');
  if (!Array.isArray(data.skills) || data.skills.length < 1) throw new Error('skills');
  const skills = data.skills.slice(0, SKILL_GRID_SIZE).map((k) => str(k, 2, 30).toLowerCase().replace(/\s+/g, '-'));
  return {
    hook: str(data.hook, 3, 120),
    priceItems,
    appName: str(data.appName, 1, 40),
    ctaKeyword,
    voiceOverUrl: '',
    skills,
  };
}

