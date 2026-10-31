import React, { useEffect, useState } from 'react';
import { Link2, Trash2 } from 'lucide-react';
import {
  InspirationSource,
  addInspiration,
  analyzeInspiration,
  deleteInspiration,
  listInspiration,
  updateInspirationNotes,
} from '../services/backendApi';

const PLATFORM_LABEL: Record<InspirationSource['platform'], string> = {
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
};

const msg = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Liens de pages ou vidéos à imiter. Llama en tire un style, qui guide les scripts générés ensuite. */
export const InspirationPanel: React.FC = () => {
  const [sources, setSources] = useState<InspirationSource[]>([]);
  const [brief, setBrief] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<'add' | 'analyze' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listInspiration()
      .then((data) => {
        if (cancelled) return;
        setSources(data.sources);
        setBrief(data.brief);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const add = async () => {
    setBusy('add');
    setError(null);
    try {
      const source = await addInspiration(url.trim());
      setSources((prev) => [source, ...prev]);
      setUrl('');
    } catch (err) {
      setError(msg(err, 'Ajout impossible.'));
    } finally {
      setBusy(null);
    }
  };

  const saveNotes = async (id: string, notes: string) => {
    try {
      await updateInspirationNotes(id, notes);
    } catch (err) {
      setError(msg(err, 'Texte non enregistré.'));
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await deleteInspiration(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(msg(err, 'Suppression impossible.'));
    }
  };

  const analyze = async () => {
    setBusy('analyze');
    setError(null);
    try {
      setBrief(await analyzeInspiration());
    } catch (err) {
      setError(msg(err, 'Analyse impossible.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl bg-[#12121A] border border-white/5 p-4 space-y-4" aria-label="Sources d'inspiration">
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sources d’inspiration</p>
        <p className="text-[11px] text-gray-500">
          Colle des liens TikTok, YouTube ou Facebook. Pour Facebook, ou si le titre n’apparaît pas, colle aussi le texte de la vidéo.
          Ensuite, « Analyser le style » : les prochains scripts s’en inspireront.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim() && busy === null) void add();
        }}
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@…/video/…"
          className="flex-1 min-w-0 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50"
        />
        <button
          type="submit"
          disabled={!url.trim() || busy !== null}
          className="px-3 py-2 rounded-xl bg-white text-black text-xs font-extrabold disabled:opacity-40"
        >
          {busy === 'add' ? 'Ajout…' : 'Ajouter'}
        </button>
      </form>

      {sources.length > 0 && (
        <ul className="space-y-3">
          {sources.map((s) => (
            <li key={s.id} className="rounded-xl bg-black/30 border border-white/5 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    <Link2 size={12} className="inline mr-1 text-[#00FFC6]" />
                    {s.title ?? `Source ${PLATFORM_LABEL[s.platform]}`}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {PLATFORM_LABEL[s.platform]}
                    {s.author ? ` · ${s.author}` : ''} · {s.url}
                  </p>
                </div>
                <button type="button" onClick={() => void remove(s.id)} aria-label="Supprimer la source" className="text-gray-500 hover:text-red-300">
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                defaultValue={s.notes}
                onBlur={(e) => {
                  if (e.target.value.trim() !== s.notes.trim()) void saveNotes(s.id, e.target.value.trim());
                }}
                rows={3}
                maxLength={2000}
                placeholder="Colle ici la description ou le script de la vidéo (optionnel, indispensable pour Facebook)"
                className="w-full rounded-lg bg-black/40 border border-white/10 p-2 text-[11px] text-gray-300 focus:outline-none focus:border-[#00FFC6]/50"
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void analyze()}
          disabled={sources.length === 0 || busy !== null}
          className="px-3 py-1.5 rounded-lg border border-[#00FFC6]/50 text-[#00FFC6] text-xs font-bold disabled:opacity-40"
        >
          {busy === 'analyze' ? 'Analyse en cours…' : 'Analyser le style'}
        </button>
      </div>

      {brief && (
        <div className="rounded-xl bg-[#00FFC6]/5 border border-[#00FFC6]/20 p-3">
          <p className="text-[10px] font-bold text-[#00FFC6] uppercase tracking-wider mb-1">Style retenu</p>
          <p className="text-xs text-gray-300 whitespace-pre-line">{brief}</p>
        </div>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}
    </section>
  );
};
