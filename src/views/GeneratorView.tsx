// Générateur vidéo : une table de scripts, un choix de modèle (Pixabay, dessin animé, Reel Replica),
// puis les champs propres au modèle choisi. Le rendu passe par le même chemin que le reste du site.
import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebase';
import { createRender, type RenderJob } from '../services/backendApi';
import { DEFAULT_RENDER_SETTINGS } from '../video-engine/montage';
import { CHARACTERS } from '../video-engine/cartoon/catalog';
import type { ReelProps } from '../video-engine/reel/props';

type ModelId = 'pixabay' | 'cartoon' | 'reel';
interface SavedScript {
  id: string;
  title: string;
  text: string;
}

const MODELS: { id: ModelId; label: string; hint: string }[] = [
  { id: 'pixabay', label: 'Pixabay', hint: 'Vidéos stock montées sur ton script' },
  { id: 'cartoon', label: 'Dessin animé', hint: 'Personnages dessinés, voix off et répliques' },
  { id: 'reel', label: 'Reel Replica', hint: 'Template de 45 s pour vendre une skill' },
];

/** Générateur sans niche : le rendu reçoit une niche neutre, la voix et le style restent ceux par défaut. */
const NEUTRAL_NICHE = { id: 'generateur', name: 'Générateur' };

const today = (): string => new Date().toISOString().slice(0, 10);
const firstLine = (text: string): string => text.split('\n').find((l) => l.trim())?.trim() ?? '';

function useScripts(uid: string): SavedScript[] {
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    return onSnapshot(collection(db, 'users', uid, 'generatorScripts'), (snap) => {
      setScripts(snap.docs.map((d) => ({ id: d.id, title: String(d.data().title ?? ''), text: String(d.data().text ?? '') })));
    });
  }, [uid]);
  return scripts;
}

/** « Nom;prix » par ligne. Les lignes mal formées sont ignorées ici ; le Worker valide le reste. */
function parsePriceLines(raw: string): ReelProps['priceItems'] {
  return raw
    .split('\n')
    .map((line) => line.split(';'))
    .filter((parts) => parts.length === 2 && parts[0].trim() && /^\d+$/.test(parts[1].trim()))
    .map(([name, price]) => ({ name: name.trim(), price: Number(price.trim()) }));
}

export const GeneratorView: React.FC<{ uid: string }> = ({ uid }) => {
  const scripts = useScripts(uid);
  const [model, setModel] = useState<ModelId>('pixabay');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [hook, setHook] = useState('');
  const [pexelsQuery, setPexelsQuery] = useState('');
  const [mainCharacter, setMainCharacter] = useState(CHARACTERS[0]?.id ?? 'employe');
  const [reelHook, setReelHook] = useState('');
  const [appName, setAppName] = useState('');
  const [ctaKeyword, setCtaKeyword] = useState('REPLICA');
  const [priceLines, setPriceLines] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<RenderJob | null>(null);

  const loadScript = (s: SavedScript) => {
    setTitle(s.title);
    setText(s.text);
  };

  const saveScript = async () => {
    if (!isFirebaseConfigured || !db) return setError('Base de données non configurée.');
    if (text.trim().length < 10) return setError('Le script doit faire au moins 10 caractères.');
    try {
      await addDoc(collection(db, 'users', uid, 'generatorScripts'), { title: title.trim() || firstLine(text).slice(0, 60), text: text.trim(), createdAt: serverTimestamp() });
      setError(null);
    } catch {
      setError("Impossible d'enregistrer le script.");
    }
  };

  const removeScript = async (id: string) => {
    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, 'users', uid, 'generatorScripts', id));
  };

  const generate = async () => {
    setError(null);
    setJob(null);
    const day = today();
    const base = {
      title: title.trim() || firstLine(text).slice(0, 60) || 'Vidéo',
      nicheId: NEUTRAL_NICHE.id,
      nicheName: NEUTRAL_NICHE.name,
      day,
      videoKey: `${day}-${Date.now() % 10}`,
      settings: DEFAULT_RENDER_SETTINGS,
    };
    setBusy(true);
    try {
      let created: RenderJob;
      if (model === 'reel') {
        const reel: ReelProps = {
          hook: reelHook.trim(),
          priceItems: parsePriceLines(priceLines),
          appName: appName.trim(),
          ctaKeyword: ctaKeyword.trim().toUpperCase(),
          voiceOverUrl: '',
          skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
        };
        created = await createRender({ ...base, title: reel.hook || base.title, hook: reel.hook, pexelsQuery: 'lifestyle', script: reel.hook, style: 'reel', reel });
      } else if (model === 'cartoon') {
        if (text.trim().length < 10) throw new Error('Le script doit faire au moins 10 caractères.');
        created = await createRender({ ...base, hook: hook.trim() || firstLine(text), pexelsQuery: 'lifestyle', script: text.trim(), style: 'cartoon', mainCharacter });
      } else {
        if (text.trim().length < 10) throw new Error('Le script doit faire au moins 10 caractères.');
        created = await createRender({ ...base, hook: hook.trim() || firstLine(text), pexelsQuery: pexelsQuery.trim() || 'lifestyle', script: text.trim(), style: 'stock' });
      }
      setJob(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lancement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500';
  const label = 'block text-xs font-bold text-gray-300 mb-1';

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-base font-black text-white mb-2">Scripts</h2>
        {scripts.length === 0 ? (
          <p className="text-xs text-gray-500">Aucun script enregistré. Écris-en un ci-dessous et ajoute-le à la table.</p>
        ) : (
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {scripts.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <button type="button" onClick={() => loadScript(s)} className="text-left text-sm text-white truncate">
                  {s.title || firstLine(s.text)}
                </button>
                <button type="button" onClick={() => removeScript(s.id)} className="text-xs text-gray-400 hover:text-red-300">
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 space-y-2">
          <input className={field} placeholder="Titre du script" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={`${field} min-h-[120px]`} placeholder="Ton script" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" onClick={saveScript} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white">
            Ajouter à la table
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-base font-black text-white mb-2">Modèle</h2>
        <div className="grid grid-cols-3 gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModel(m.id)}
              className={`rounded-xl border p-3 text-left ${model === m.id ? 'border-[#FF6A2B] bg-[#FF6A2B]/10' : 'border-white/10 bg-white/5'}`}
            >
              <div className="text-sm font-black text-white">{m.label}</div>
              <div className="text-[11px] text-gray-400 mt-1">{m.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-black text-white">Réglages du modèle</h2>
        {model === 'pixabay' && (
          <>
            <div>
              <label className={label}>Accroche</label>
              <input className={field} value={hook} onChange={(e) => setHook(e.target.value)} />
            </div>
            <div>
              <label className={label}>Recherche Pixabay (mots-clés)</label>
              <input className={field} value={pexelsQuery} onChange={(e) => setPexelsQuery(e.target.value)} />
            </div>
          </>
        )}
        {model === 'cartoon' && (
          <>
            <div>
              <label className={label}>Accroche</label>
              <input className={field} value={hook} onChange={(e) => setHook(e.target.value)} />
            </div>
            <div>
              <label className={label}>Personnage principal</label>
              <select className={field} value={mainCharacter} onChange={(e) => setMainCharacter(e.target.value)}>
                {CHARACTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {model === 'reel' && (
          <>
            <div>
              <label className={label}>Accroche (le dernier mot est mis en évidence)</label>
              <input className={field} value={reelHook} onChange={(e) => setReelHook(e.target.value)} />
            </div>
            <div>
              <label className={label}>Nom de l'application</label>
              <input className={field} value={appName} onChange={(e) => setAppName(e.target.value)} />
            </div>
            <div>
              <label className={label}>Mot-clé de commentaire</label>
              <input className={field} value={ctaKeyword} onChange={(e) => setCtaKeyword(e.target.value)} />
            </div>
            <div>
              <label className={label}>Outils payants : une ligne par outil, « nom;prix » (en €)</label>
              <textarea className={`${field} min-h-[90px]`} placeholder={'Rédaction;29\nDesign;15'} value={priceLines} onChange={(e) => setPriceLines(e.target.value)} />
            </div>
            <div>
              <label className={label}>11 skills, séparées par des virgules</label>
              <textarea className={`${field} min-h-[70px]`} value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
            </div>
          </>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={generate}
          className="w-full px-4 py-3 rounded-xl bg-[#FF6A2B] hover:bg-[#ff7d45] disabled:opacity-50 text-sm font-black text-white"
        >
          {busy ? 'Lancement…' : 'Générer la vidéo'}
        </button>
        {error && <p className="text-xs text-red-300">{error}</p>}
        {job && <p className="text-xs text-emerald-300">Rendu lancé ({job.id}). Il apparaît dans la file de rendus.</p>}
      </section>
    </div>
  );
};
