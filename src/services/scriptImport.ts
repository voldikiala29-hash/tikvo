// Import d'un script complet (format, audio, voix off, texte à l'écran, indications de tournage).
// Seul ce qui est dit (texte entre guillemets ou sous « Voix off ») devient la voix off.
// Aucun import : testé tel quel sous Node.

export interface ImportedScript {
  format: string | null;
  audio: string | null;
  /** Texte parlé, une phrase par ligne. */
  voiceover: string;
  /** Textes à l'écran (le premier sert d'accroche). */
  onScreen: string[];
  /** Indications de tournage : à filmer ou à montrer, non générées. */
  shots: string[];
}

const QUOTE = /["“«]([^"”»]+)["”»]/g;
const TIMECODE = /^\d{1,2}:\d{2}/;
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function parseScriptPaste(raw: string): ImportedScript {
  const out: ImportedScript = { format: null, audio: null, voiceover: '', onScreen: [], shots: [] };
  const spoken: string[] = [];
  const unlabelled: string[] = [];
  let mode: 'none' | 'voice' | 'screen' | 'shot' = 'none';

  for (const line of raw.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const quotes = Array.from(line.matchAll(QUOTE), (m) => m[1].trim()).filter(Boolean);
    spoken.push(...quotes);

    const label = !TIMECODE.test(line) ? line.match(/^([^:]{1,60}):\s*(.*)$/) : null;
    if (label) {
      const key = norm(label[1]);
      const content = label[2].replace(QUOTE, '').trim();
      if (key.startsWith('format')) {
        out.format = label[2].trim();
        mode = 'none';
        continue;
      }
      if (key.startsWith('audio')) {
        out.audio = label[2].trim();
        mode = 'none';
        continue;
      }
      if (key.startsWith('voix')) {
        mode = 'voice';
        if (content) spoken.push(content);
        continue;
      }
      if (key.startsWith('texte')) {
        mode = 'screen';
        if (content) out.onScreen.push(content);
        continue;
      }
      mode = 'shot';
      if (content) out.shots.push(line);
      continue;
    }

    if (quotes.length > 0) continue; // déjà pris comme parole
    if (TIMECODE.test(line)) {
      // Repère de scène (« 0:02 - 0:08 HOOK… ») : il ferme le bloc précédent.
      out.shots.push(line);
      mode = 'shot';
      continue;
    }
    if (mode === 'screen') {
      out.onScreen.push(line);
    } else if (mode === 'voice') {
      spoken.push(line);
    } else {
      // Repères de scène (« 0:00 - 0:02 HOOK… ») ou consignes sans étiquette.
      out.shots.push(line);
      unlabelled.push(line);
    }
  }

  // Script sans structure : tout le texte devient la voix off.
  const parts = spoken.length > 0 ? spoken : unlabelled;
  out.voiceover = parts.map((p) => p.trim()).filter(Boolean).join('\n');
  return out;
}
