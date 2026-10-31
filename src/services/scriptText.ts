// Mise en forme d'un script produit par l'IA (sans import : testable sous Node).
export interface AIScriptParts {
  hook: string;
  phrase1: string;
  phrase2: string;
  cta: string;
}

/** Ajoute la ponctuation finale si elle manque (la voix lit mieux). */
export const punctuate = (line: string): string => (/[.!?…]$/.test(line) ? line : `${line}.`);

export function scriptFromAI(parts: AIScriptParts): string {
  return [parts.hook, parts.phrase1, parts.phrase2, parts.cta].map(punctuate).join('\n');
}

/** Première ligne du script : sert d'accroche à l'image. */
export function firstLine(script: string): string {
  return script.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
}
