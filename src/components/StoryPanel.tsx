// Histoire en dessin animé : choix du point de départ (sujet proposé, sujet écrit ou script),
// du mode (narrateur, dialogues ou les deux), aperçu de l'histoire, puis rendu.
import React, { useEffect, useState } from 'react';
import { createRender, generateStory, getStorySubjects, type RenderJob } from '../services/backendApi';
import { StoryEditor } from './StoryEditor';
import type { RenderSettings } from '../video-engine/montage';
import { storyText, type Story, type StoryMode } from '../video-engine/story';

type Source = 'proposed' | 'topic' | 'script';

const MODES: { id: StoryMode; label: string }[] = [
  { id: 'narrator', label: 'Narrateur seul' },
  { id: 'dialogue', label: 'Dialogues seuls' },
  { id: 'both', label: 'Les deux' },
];

const errorText = (err: unknown, fallback: string): string => (err instanceof Error && err.message ? err.message : fallback);

export const StoryPanel: React.FC<{
  day: string;
  videoKey: string;
  nicheId: string;
  nicheName: string;
  settings: RenderSettings;
  onRender: (job: RenderJob) => void;
}> = ({ day, videoKey, nicheId, nicheName, settings, onRender }) => {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>('proposed');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [mode, setMode] = useState<StoryMode>('both');
  const [story, setStory] = useState<Story | null>(null);
  const [busy, setBusy] = useState<'subjects' | 'story' | 'render' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = async () => {
    setBusy('subjects');
    setError(null);
    try {
      setSubjects(await getStorySubjects());
    } catch (err) {
      setError(errorText(err, 'Sujets indisponibles.'));
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (open && subjects.length === 0) void loadSubjects();
    // Chargement à l'ouverture seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const write = async () => {
    setError(null);
    const input =
      source === 'script'
        ? { source: 'script' as const, script: script.trim(), mode }
        : { source: 'topic' as const, topic: (source === 'proposed' ? subject ?? '' : topic).trim(), mode };
    if (input.source === 'script' && input.script.length < 10) return setError('Écris ton script (au moins 10 caractères).');
    if (input.source === 'topic' && input.topic.length < 5) return setError('Choisis un sujet ou écris-en un.');
    setBusy('story');
    try {
      setStory(await generateStory(input));
    } catch (err) {
      setError(errorText(err, 'Histoire impossible à générer.'));
    } finally {
      setBusy(null);
    }
  };

  const render = async () => {
    if (!story) return;
    setBusy('render');
    setError(null);
    try {
      const job = await createRender({
        title: story.title,
        hook: story.hook,
        script: storyText(story),
        pexelsQuery: 'dessin animé',
        nicheId,
        nicheName,
        day,
        videoKey,
        settings,
        style: 'cartoon',
        story,
      });
      onRender(job);
    } catch (err) {
      setError(errorText(err, 'Lancement impossible.'));
    } finally {
      setBusy(null);
    }
  };

  const pill = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-xs font-bold ${active ? 'border-[#00FFC6] text-[#00FFC6] bg-[#00FFC6]/10' : 'border-white/10 text-gray-400'}`;

  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-[11px] font-bold text-[#00FFC6] hover:underline">
        {open ? 'Fermer l’histoire' : 'Créer une histoire en dessin animé'}
      </button>

      {open && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(
              [
                ['proposed', 'Sujet proposé'],
                ['topic', 'Mon sujet'],
                ['script', 'Mon script'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={source === id} onClick={() => setSource(id)} className={`flex-1 ${pill(source === id)}`}>
                {label}
              </button>
            ))}
          </div>

          {source === 'proposed' && (
            <div className="space-y-2">
              {subjects.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={subject === s}
                  onClick={() => setSubject(s)}
                  className={`block w-full text-left text-xs rounded-lg border px-3 py-2 ${subject === s ? 'border-[#00FFC6] text-white' : 'border-white/10 text-gray-300'}`}
                >
                  {s}
                </button>
              ))}
              <button type="button" onClick={() => void loadSubjects()} disabled={busy === 'subjects'} className="text-[11px] font-bold text-[#00FFC6] disabled:opacity-50">
                {busy === 'subjects' ? 'Recherche…' : 'Autre sujet'}
              </button>
            </div>
          )}

          {source === 'topic' && (
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex. un employé qui découvre une erreur sur sa fiche de paie"
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50"
            />
          )}

          {source === 'script' && (
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={4}
              placeholder="Ton texte : il sera repris tel quel, et les héros et les scènes seront créés autour."
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-gray-200 leading-relaxed focus:outline-none focus:border-[#00FFC6]/50"
            />
          )}

          <div className="flex gap-2">
            {MODES.map((m) => (
              <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)} className={`flex-1 ${pill(mode === m.id)}`}>
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void write()}
            disabled={busy !== null}
            className="w-full rounded-xl bg-[#00FFC6] text-black font-bold text-xs py-2.5 disabled:opacity-50"
          >
            {busy === 'story' ? 'Écriture de l’histoire…' : story ? 'Réécrire l’histoire' : 'Écrire l’histoire'}
          </button>

          {error && <p className="text-[11px] text-red-400">{error}</p>}

          {story && (
            <div className="space-y-3 rounded-xl bg-black/30 p-3">
              <div className="space-y-2">
                <span className="block text-[11px] text-gray-400">Titre</span>
                <input value={story.title} onChange={(e) => setStory({ ...story, title: e.target.value.slice(0, 80) })} className="w-full rounded-lg bg-black/40 border border-white/10 p-2 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50" />
                <span className="block text-[11px] text-gray-400">Accroche</span>
                <input value={story.hook} onChange={(e) => setStory({ ...story, hook: e.target.value.slice(0, 120) })} className="w-full rounded-lg bg-black/40 border border-white/10 p-2 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50" />
              </div>

              <StoryEditor story={story} onChange={setStory} />

              <button
                type="button"
                onClick={() => void render()}
                disabled={busy !== null}
                className="w-full rounded-xl border border-[#00FFC6] text-[#00FFC6] font-bold text-xs py-2.5 disabled:opacity-50"
              >
                {busy === 'render' ? 'Lancement…' : 'Lancer le rendu de cette histoire'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
