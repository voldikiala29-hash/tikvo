// Générateur vidéo : l'utilisateur écrit un prompt, le site génère le texte (script ou structure reel),
// l'utilisateur le relit, puis lance le rendu avec le modèle choisi (Pixabay, dessin animé, Reel Replica).
import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebase';
import { createRender, generateReel, generateScript, getRenderSettings, saveRenderSettings, type RenderJob } from '../services/backendApi';
import { DEFAULT_RENDER_SETTINGS, resolveRenderSettings, type RenderSettings } from '../video-engine/montage';
import { RenderSettingsPanel } from '../components/RenderSettingsPanel';
import { CHARACTERS } from '../video-engine/cartoon/catalog';
import type { ReelProps } from '../video-engine/reel/props';

type ModelId = 'pixabay' | 'cartoon' | 'reel';
interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
}
/** Texte généré, prêt à relire : script (Pixabay, dessin animé) ou structure reel. */
type Draft = { kind: 'script'; script: string; hook: string } | { kind: 'reel'; reel: ReelProps };

const MODELS: { id: ModelId; label: string; hint: string }[] = [
  { id: 'pixabay', label: 'Pixabay', hint: 'Vidéos stock montées sur le texte généré' },
  { id: 'cartoon', label: 'Dessin animé', hint: 'Personnages dessinés, voix off' },
  { id: 'reel', label: 'Reel Replica', hint: 'Template de 45 s pour vendre une skill' },
];

const SETTINGS_KEY = 'tikvo.renderSettings.v1';
/** Niche neutre : le rendu garde la voix et les réglages par défaut. */
const NEUTRAL_NICHE = { id: 'generateur', name: 'Générateur' };

function readLocalSettings(): RenderSettings | null {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? resolveRenderSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocalSettings(settings: RenderSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* stockage indisponible : le réglage reste en mémoire et côté serveur */
  }
}

const today = (): string => new Date().toISOString().slice(0, 10);

function usePrompts(uid: string): SavedPrompt[] {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    return onSnapshot(collection(db, 'users', uid, 'generatorPrompts'), (snap) => {
      setPrompts(snap.docs.map((d) => ({ id: d.id, title: String(d.data().title ?? ''), prompt: String(d.data().prompt ?? '') })));
    });
  }, [uid]);
  return prompts;
}

export const GeneratorView: React.FC<{ uid: string }> = ({ uid }) => {
  const prompts = usePrompts(uid);
  const [model, setModel] = useState<ModelId>('pixabay');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [mainCharacter, setMainCharacter] = useState(CHARACTERS[0]?.id ?? 'employe');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [settings, setSettings] = useState<RenderSettings>(() => readLocalSettings() ?? DEFAULT_RENDER_SETTINGS);
  const [busy, setBusy] = useState<'text' | 'render' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<RenderJob | null>(null);

  // Réglages enregistrés sur le serveur : ils priment sur le choix local.
  useEffect(() => {
    getRenderSettings()
      .then(({ settings: remote, saved }) => {
        if (!saved) return;
        setSettings(remote);
        writeLocalSettings(remote);
      })
      .catch(() => undefined);
  }, []);

  const changeSettings = (next: RenderSettings) => {
    setSettings(next);
    writeLocalSettings(next);
    saveRenderSettings(next).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Réglages non enregistrés.'));
  };

  const changeModel = (next: ModelId) => {
    setModel(next);
    setDraft(null);
  };

  const savePrompt = async () => {
    if (!isFirebaseConfigured || !db) return setError('Base de données non configurée.');
    if (prompt.trim().length < 5) return setError('Le prompt doit faire au moins 5 caractères.');
    try {
      await addDoc(collection(db, 'users', uid, 'generatorPrompts'), { title: title.trim() || prompt.trim().slice(0, 60), prompt: prompt.trim(), createdAt: serverTimestamp() });
      setError(null);
    } catch {
      setError("Impossible d'enregistrer le prompt.");
    }
  };

  const removePrompt = async (id: string) => {
    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, 'users', uid, 'generatorPrompts', id));
  };

  const loadPrompt = (p: SavedPrompt) => {
    setTitle(p.title);
    setPrompt(p.prompt);
    setDraft(null);
  };

  /** Étape 1 : le prompt devient un texte (script ou structure reel) à relire. */
  const writeText = async () => {
    setError(null);
    setJob(null);
    if (prompt.trim().length < 5) return setError('Écris un prompt (au moins 5 caractères).');
    setBusy('text');
    try {
      if (model === 'reel') {
        const reel = await generateReel(prompt.trim());
        setDraft({ kind: 'reel', reel });
      } else {
        const { script, hook } = await generateScript(prompt.trim());
        setDraft({ kind: 'script', script, hook });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Texte non généré.');
    } finally {
      setBusy(null);
    }
  };

  /** Étape 2 : le texte relu part en rendu avec le modèle choisi. */
  const render = async () => {
    if (!draft) return;
    setError(null);
    setBusy('render');
    const day = today();
    const base = {
      title: title.trim() || (draft.kind === 'reel' ? draft.reel.hook : draft.hook).slice(0, 60) || 'Vidéo',
      nicheId: NEUTRAL_NICHE.id,
      nicheName: NEUTRAL_NICHE.name,
      day,
      videoKey: `${day}-${Date.now() % 10}`,
      settings,
    };
    try {
      let created: RenderJob;
      if (draft.kind === 'reel') {
        created = await createRender({ ...base, hook: draft.reel.hook, pexelsQuery: 'lifestyle', script: draft.reel.hook, style: 'reel', reel: draft.reel });
      } else if (model === 'cartoon') {
        created = await createRender({ ...base, hook: draft.hook, pexelsQuery: 'lifestyle', script: draft.script, style: 'cartoon', mainCharacter });
      } else {
        created = await createRender({ ...base, hook: draft.hook, pexelsQuery: prompt.trim().slice(0, 100), script: draft.script, style: 'stock' });
      }
      setJob(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lancement impossible.');
    } finally {
      setBusy(null);
    }
  };

  const field = 'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500';
  const label = 'block text-xs font-bold text-gray-300 mb-1';

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-base font-black text-white mb-2">Prompts</h2>
        {prompts.length === 0 ? (
          <p className="text-xs text-gray-500">Aucun prompt enregistré. Écris-en un ci-dessous et ajoute-le à la table.</p>
        ) : (
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {prompts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <button type="button" onClick={() => loadPrompt(p)} className="text-left text-sm text-white truncate">
                  {p.title || p.prompt.slice(0, 60)}
                </button>
                <button type="button" onClick={() => removePrompt(p.id)} className="text-xs text-gray-400 hover:text-red-300">
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-black text-white">Ton prompt</h2>
        <input className={field} placeholder="Titre (facultatif)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          className={`${field} min-h-[110px]`}
          placeholder="Décris la vidéo que tu veux : le sujet, le ton, ce qui doit être dit."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button type="button" onClick={savePrompt} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white">
          Ajouter à la table
        </button>
      </section>

      <section>
        <h2 className="text-base font-black text-white mb-2">Modèle</h2>
        <div className="grid grid-cols-3 gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => changeModel(m.id)}
              className={`rounded-xl border p-3 text-left ${model === m.id ? 'border-[#FF6A2B] bg-[#FF6A2B]/10' : 'border-white/10 bg-white/5'}`}
            >
              <div className="text-sm font-black text-white">{m.label}</div>
              <div className="text-[11px] text-gray-400 mt-1">{m.hint}</div>
            </button>
          ))}
        </div>
        {model === 'cartoon' && (
          <div className="mt-3">
            <label className={label}>Personnage principal</label>
            <select className={field} value={mainCharacter} onChange={(e) => setMainCharacter(e.target.value)}>
              {CHARACTERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <RenderSettingsPanel settings={settings} onChange={changeSettings} />

      <section className="space-y-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={writeText}
          className="w-full px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 text-sm font-black text-white"
        >
          {busy === 'text' ? 'Écriture du texte…' : 'Écrire le texte à partir du prompt'}
        </button>

        {draft?.kind === 'script' && (
          <div className="space-y-2">
            <label className={label}>Texte généré (tu peux le modifier)</label>
            <textarea className={`${field} min-h-[150px]`} value={draft.script} onChange={(e) => setDraft({ ...draft, script: e.target.value })} />
          </div>
        )}
        {draft?.kind === 'reel' && (
          <div className="rounded-xl border border-white/10 p-3 text-xs text-gray-300 space-y-1">
            <p>
              <span className="font-bold text-white">Accroche :</span> {draft.reel.hook}
            </p>
            <p>
              <span className="font-bold text-white">Application :</span> {draft.reel.appName} · mot-clé {draft.reel.ctaKeyword}
            </p>
            <p>
              <span className="font-bold text-white">Outils :</span> {draft.reel.priceItems.map((p) => `${p.name} ${p.price} €`).join(' · ')}
            </p>
            <p>
              <span className="font-bold text-white">Skills :</span> {draft.reel.skills.length}
            </p>
          </div>
        )}

        {draft && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={render}
            className="w-full px-4 py-3 rounded-xl bg-[#FF6A2B] hover:bg-[#ff7d45] disabled:opacity-50 text-sm font-black text-white"
          >
            {busy === 'render' ? 'Lancement…' : 'Lancer le rendu'}
          </button>
        )}
        {error && <p className="text-xs text-red-300">{error}</p>}
        {job && <p className="text-xs text-emerald-300">Rendu lancé ({job.id}). Il apparaît dans la file de rendus.</p>}
      </section>
    </div>
  );
};
