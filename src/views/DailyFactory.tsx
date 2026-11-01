import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Film } from 'lucide-react';
import { CopyScriptButton } from '../components/CopyScriptButton';
import { MediaPanel } from '../components/MediaPanel';
import { InspirationPanel } from '../components/InspirationPanel';
import {
  ApiError,
  PexelsPreviewItem,
  RenderJob,
  createRender,
  getRender,
  getRenderSettings,
  generateScripts,
  getScriptOverrides,
  listDayRenders,
  rewriteScript,
  saveRenderSettings,
  saveScriptOverride,
  searchPexels,
} from '../services/backendApi';
import { StoredProgram, UserProfile, loadProgram, saveGeneratedProgram } from '../services/factoryStore';
import { NICHE_CATALOG, ProgramDay, ProgramVideo, generateProgram, toLocalISODate, type NicheId } from '../services/programGenerator';
import { carryOverrides, nichesOf, totalOf, withNicheForVideo, withProgramNiches } from '../services/programEdit';
import { firstLine, scriptFromAI } from '../services/scriptText';
import { parseScriptPaste, type ImportedScript } from '../services/scriptImport';
import { VOICES, VOICE_STYLES, resolveVoice } from '../video-engine/voices';
import { parseStoryboard } from '../video-engine/storyboard';
import {
  ASPECTS,
  CLIP_CHOICES,
  DEFAULT_RENDER_SETTINGS,
  MONTAGES,
  RenderSettings,
  estimateSeconds,
  resolveRenderSettings,
} from '../video-engine/montage';

interface DailyFactoryProps {
  uid: string;
  profile: UserProfile;
  onViewProgram: () => void;
}

const POLL_MS = 5000;
const STYLE_STORAGE_KEY = 'tikvo.renderSettings.v1';

/** Dernier choix de format et de style, mémorisé sur cet appareil (affichage immédiat). */
function readLocalSettings(): RenderSettings | null {
  try {
    const raw = window.localStorage.getItem(STYLE_STORAGE_KEY);
    return raw ? resolveRenderSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocalSettings(settings: RenderSettings): void {
  try {
    window.localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* stockage indisponible (navigation privée, quota) : le choix reste en mémoire et côté serveur */
  }
}
const REWRITE_TARGETS = [15, 30, 60] as const;
const RATIO: Record<string, string> = { '9:16': '9 / 16', '16:9': '16 / 9', '1:1': '1 / 1', '4:5': '4 / 5' };

const nicheLabel = (id: string) => NICHE_CATALOG.find((n) => n.id === id)?.label ?? id;
const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const isActive = (job: RenderJob | null | undefined) => !!job && (job.status === 'queued' || job.status === 'rendering');
const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

const Chip: React.FC<{ active: boolean; onClick: () => void; title?: string; children: React.ReactNode }> = ({
  active,
  onClick,
  title,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={active}
    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
      active ? 'border-[#00FFC6] text-[#00FFC6] bg-[#00FFC6]/10' : 'border-white/10 text-gray-400 hover:text-white'
    }`}
  >
    {children}
  </button>
);

const SettingsPanel: React.FC<{ settings: RenderSettings; onChange: (next: RenderSettings) => void }> = ({ settings, onChange }) => {
  const montage = MONTAGES.find((m) => m.id === settings.montage) ?? MONTAGES[0];
  return (
    <section className="rounded-2xl bg-[#12121A] border border-white/5 p-4 space-y-4" aria-label="Réglages du rendu">
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Format</p>
        <div className="flex flex-wrap gap-1.5">
          {ASPECTS.map((a) => (
            <Chip key={a.id} active={settings.aspect === a.id} title={a.hint} onClick={() => onChange({ ...settings, aspect: a.id })}>
              {a.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Style de montage</p>
        <div className="flex flex-wrap gap-1.5">
          {MONTAGES.map((m) => (
            <Chip key={m.id} active={settings.montage === m.id} onClick={() => onChange({ ...settings, montage: m.id })}>
              {m.label}
            </Chip>
          ))}
        </div>
        <p className="text-[11px] text-[#00FFC6]/80">{montage.label} : {montage.description}</p>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Plans vidéo par script</p>
        <div className="flex flex-wrap gap-1.5">
          {CLIP_CHOICES.map((c) => (
            <Chip key={c} active={settings.clipsPerScript === c} onClick={() => onChange({ ...settings, clipsPerScript: c })}>
              {c === 0 ? 'Auto' : `${c} plans`}
            </Chip>
          ))}
        </div>
      </div>
    </section>
  );
};

/** Aperçu vertical réel (clip Pixabay via le Worker). Décalé pour rester sous la limite du fournisseur. */
const NichePanel: React.FC<{ niches: NicheId[]; disabled: boolean; onChange: (next: NicheId[]) => void }> = ({
  niches,
  disabled,
  onChange,
}) => {
  const free = NICHE_CATALOG.filter((n) => !niches.includes(n.id));
  return (
    <section className="rounded-2xl bg-[#12121A] border border-white/5 p-4 space-y-3">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Niches du programme</p>
      <div className="flex flex-wrap gap-2">
        {niches.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 pl-1 pr-1 py-0.5 rounded-full bg-[#00FFC6]/10 border border-[#00FFC6]/30"
          >
            <select
              value={id}
              disabled={disabled}
              onChange={(e) => onChange(niches.map((n) => (n === id ? (e.target.value as NicheId) : n)))}
              className="bg-transparent text-[#00FFC6] text-xs font-bold focus:outline-none disabled:opacity-40"
            >
              <option value={id} className="bg-[#12121A]">
                {nicheLabel(id)}
              </option>
              {free.map((n) => (
                <option key={n.id} value={n.id} className="bg-[#12121A] text-white">
                  {n.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={`Retirer ${nicheLabel(id)}`}
              disabled={disabled || niches.length <= 1}
              onClick={() => onChange(niches.filter((n) => n !== id))}
              className="px-1.5 text-[#00FFC6]/70 hover:text-white text-sm leading-none disabled:opacity-30"
            >
              ×
            </button>
          </span>
        ))}
        {niches.length < 3 && (
          <select
            value=""
            disabled={disabled || free.length === 0}
            onChange={(e) => e.target.value && onChange([...niches, e.target.value as NicheId])}
            className="rounded-full bg-black/40 border border-white/10 px-3 py-1 text-xs text-gray-300 focus:outline-none disabled:opacity-40"
          >
            <option value="">+ Ajouter une niche</option>
            {free.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="text-[11px] text-gray-500">
        Change une niche ici : les vidéos à partir de demain sont recréées. Aujourd’hui et les scripts déjà validés restent.
      </p>
    </section>
  );
};

const ClipPreview: React.FC<{ query: string; delayMs: number }> = ({ query, delayMs }) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ok'; video: PexelsPreviewItem }
    | { status: 'empty' }
    | { status: 'rate_limited' | 'error'; message: string }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    const timer = window.setTimeout(() => {
      searchPexels(query, 1)
        .then((videos) => {
          if (!cancelled) setState(videos[0] ? { status: 'ok', video: videos[0] } : { status: 'empty' });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (err instanceof ApiError && err.code === 'PIXABAY_429') setState({ status: 'rate_limited', message: err.message });
          else setState({ status: 'error', message: errorText(err, 'Aperçu indisponible.') });
        });
    }, delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, delayMs, attempt]);

  if (state.status === 'ok') {
    return (
      <video
        key={state.video.id}
        src={state.video.url}
        poster={state.video.preview}
        muted
        loop
        playsInline
        controls
        className="w-full aspect-[9/16] rounded-xl object-cover bg-black"
      />
    );
  }

  return (
    <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-gradient-to-br from-pink-600 via-purple-700 to-indigo-900 flex flex-col items-center justify-center gap-2 text-white/80 p-3 text-center">
      {state.status === 'loading' && <div className="w-6 h-6 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />}
      {state.status === 'empty' && (
        <>
          <Film size={28} />
          <span className="text-[10px] leading-snug">Aucun aperçu trouvé</span>
        </>
      )}
      {(state.status === 'error' || state.status === 'rate_limited') && (
        <>
          <Film size={28} />
          <span className="text-[10px] leading-snug">{state.message}</span>
          {state.status === 'rate_limited' && (
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-1 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold"
            >
              Réessayer
            </button>
          )}
        </>
      )}
    </div>
  );
};

interface DailyVideoCardProps {
  video: ProgramVideo;
  date: string;
  index: number;
  programId: string;
  savedScript: string;
  settings: RenderSettings;
  renders: RenderJob[];
  onRender: (job: RenderJob) => void;
  onScriptSaved: (key: string, script: string) => void;
  onNicheChange: (niche: NicheId) => void;
}

const DailyVideoCard: React.FC<DailyVideoCardProps> = ({
  video,
  date,
  index,
  programId,
  savedScript,
  settings,
  renders,
  onRender,
  onScriptSaved,
  onNicheChange,
}) => {
  const videoKey = `${date}-${index}`;
  const overrideKey = `${programId}|${date}|${index}`;
  const [script, setScript] = useState(savedScript);
  // Storyboard : plans voulus, gardés par carte (navigateur uniquement, pour ne pas les perdre au rechargement).
  const storyboardKey = `tikvo.storyboard.${videoKey}`;
  const [storyboardText, setStoryboardText] = useState(() => {
    try {
      return window.localStorage.getItem(storyboardKey) ?? '';
    } catch {
      return '';
    }
  });
  const board = parseStoryboard(storyboardText);
  const [rewriting, setRewriting] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Import d'un script complet : la voix off remplace le script, le texte à l'écran devient l'accroche.
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [imported, setImported] = useState<ImportedScript | null>(null);
  const [hookOverride, setHookOverride] = useState<string | null>(null);
  // Voix et style : ceux de la niche par défaut, modifiables pour ce rendu.
  const nicheVoice = resolveVoice(video.niche);
  const [voiceId, setVoiceId] = useState(nicheVoice.voice);
  const [styleId, setStyleId] = useState(nicheVoice.style);
  useEffect(() => {
    const v = resolveVoice(video.niche);
    setVoiceId(v.voice);
    setStyleId(v.style);
  }, [video.niche]);

  // Le script affiché suit la version enregistrée (par exemple après un rechargement).
  useEffect(() => setScript(savedScript), [savedScript]);

  const job = renders.find((r) => r.videoKey === videoKey) ?? null;
  const rendered = job?.status === 'rendered' && !!job.videoUrl;
  const wide = rendered && (job?.settings.aspect === '16:9' || job?.settings.aspect === '1:1');
  const seconds = Math.round(estimateSeconds(script));
  const dirty = script.trim() !== savedScript.trim();

  const persist = async (text: string) => {
    const clean = text.trim();
    if (clean.length < 10 || clean === savedScript.trim()) return;
    try {
      await saveScriptOverride(overrideKey, clean);
      onScriptSaved(overrideKey, clean);
    } catch (err) {
      setError(errorText(err, 'Enregistrement du script impossible.'));
    }
  };

  const rewrite = async (target: number) => {
    setRewriting(target);
    setError(null);
    try {
      const next = await rewriteScript(script, target);
      setScript(next);
      await persist(next);
    } catch (err) {
      setError(errorText(err, 'Réécriture impossible.'));
    } finally {
      setRewriting(null);
    }
  };

  const generate = async (recreate = false) => {
    if (board.errors.length > 0) {
      setError(board.errors[0]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createRender({
        storyboard: board.shots.length > 0 ? board.shots : undefined,
        title: video.title,
        hook: hookOverride || firstLine(script) || video.hook,
        script: script.trim(),
        pexelsQuery: video.pexelsQuery,
        nicheId: video.niche,
        nicheName: nicheLabel(video.niche),
        day: date,
        videoKey,
        settings: { ...settings, voice: voiceId, voiceStyle: styleId },
        force: recreate,
        variant: recreate ? 1 + Math.floor(Math.random() * 998) : 0,
      });
      onRender(created);
    } catch (err) {
      setError(errorText(err, 'Lancement impossible.'));
    } finally {
      setBusy(false);
    }
  };

  const player =
    rendered && job?.videoUrl ? (
      <video
        key={job.id}
        src={job.videoUrl}
        controls
        playsInline
        className={`bg-black rounded-xl ${wide ? 'w-full' : 'w-full'}`}
        style={{ aspectRatio: RATIO[job.settings.aspect] ?? '9 / 16', objectFit: 'contain' }}
      />
    ) : null;

  return (
    <article className="rounded-2xl bg-[#12121A] border border-white/5 p-4 space-y-4">
      {wide && player}
      <div className="grid gap-4 md:grid-cols-[160px_1fr]">
        {!wide && (player ?? <ClipPreview query={video.pexelsQuery} delayMs={index * 500} />)}
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#00FFC6] bg-[#00FFC6]/10 px-2 py-0.5 rounded">
              {video.time} · {nicheLabel(video.niche)}
            </span>
            <span className="text-[10px] text-gray-500">Vidéo {index + 1}/3</span>
          </div>
          <h3 className="text-sm font-bold text-white">{video.title}</h3>
          <p className="text-[11px] text-gray-400">Plans : une image par phrase du script, selon ce qui est dit</p>
          <label className="flex items-center gap-2 text-[11px] text-gray-400">
            <span>Niche</span>
            <select
              value={video.niche}
              onChange={(e) => onNicheChange(e.target.value as NicheId)}
              className="rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50"
            >
              {NICHE_CATALOG.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span>Script</span>
              <span>≈ {seconds} s de voix{dirty ? ' · non enregistré' : ''}</span>
            </span>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              onBlur={() => void persist(script)}
              rows={5}
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-gray-200 leading-relaxed focus:outline-none focus:border-[#00FFC6]/50"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span>Plans voulus (facultatif)</span>
              <span>{board.shots.length} plan(s)</span>
            </span>
            <textarea
              value={storyboardText}
              onChange={(e) => {
                setStoryboardText(e.target.value);
                try {
                  window.localStorage.setItem(storyboardKey, e.target.value);
                } catch {
                  /* stockage indisponible : les plans restent affichés, sans être gardés */
                }
              }}
              rows={4}
              placeholder={'Plan 1 | 4 s | femme qui pleure dans la cuisine\nPlan 2 | 3 s | billets de banque sur une table'}
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-gray-200 leading-relaxed focus:outline-none focus:border-[#00FFC6]/50"
            />
            <span className="block text-[10px] text-gray-500 mt-1">
              Un plan par ligne, dans l’ordre. La durée est facultative ; les durées sont ajustées pour coller à la voix off.
            </span>
            {board.errors.length > 0 && <span className="block text-[11px] text-red-400 mt-1">{board.errors[0]}</span>}
          </label>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setImportOpen((v) => !v)}
              className="text-[11px] font-bold text-[#00FFC6] hover:underline"
            >
              {importOpen ? 'Fermer l’import' : 'Importer un script complet (format, voix, texte à l’écran)'}
            </button>
            {importOpen && (
              <div className="space-y-2 rounded-xl border border-white/10 p-3">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={6}
                  placeholder="Colle ton script ici (format, audio, 0:00 - 0:02…, « voix »…)"
                  className="w-full rounded-lg bg-black/40 border border-white/10 p-2 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50"
                />
                <button
                  type="button"
                  onClick={() => setImported(parseScriptPaste(importText))}
                  disabled={importText.trim().length < 10}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold disabled:opacity-40"
                >
                  Analyser
                </button>
                {imported && (
                  <div className="space-y-1.5 text-[11px] text-gray-300">
                    {imported.format && <p><span className="text-gray-500">Format :</span> {imported.format}</p>}
                    {imported.audio && <p><span className="text-gray-500">Audio :</span> {imported.audio}</p>}
                    {imported.onScreen.length > 0 && (
                      <p><span className="text-gray-500">Texte à l’écran (accroche) :</span> {imported.onScreen.join(' · ')}</p>
                    )}
                    <p><span className="text-gray-500">Voix off détectée :</span></p>
                    <pre className="whitespace-pre-wrap rounded-lg bg-black/40 p-2 text-gray-200">{imported.voiceover || '(aucune parole détectée)'}</pre>
                    {imported.shots.length > 0 && (
                      <div>
                        <p className="text-gray-500">À filmer ou montrer (non généré par tikvo) :</p>
                        <ul className="list-disc pl-4">
                          {imported.shots.map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={imported.voiceover.length < 10}
                      onClick={() => {
                        setScript(imported.voiceover);
                        setHookOverride(imported.onScreen[0] ?? null);
                        void persist(imported.voiceover);
                        setImportOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black text-xs font-extrabold disabled:opacity-40"
                    >
                      Utiliser cette voix off pour la vidéo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[11px] text-gray-400 mb-1">Voix off</span>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} · {v.gender} · {v.note}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] text-gray-400 mb-1">Style de voix</span>
              <select
                value={styleId}
                onChange={(e) => setStyleId(e.target.value)}
                className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50"
              >
                {VOICE_STYLES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-gray-500 mr-1">Ajuster la durée :</span>
            {REWRITE_TARGETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => void rewrite(t)}
                disabled={rewriting !== null}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-white/10 text-gray-300 hover:text-white disabled:opacity-40"
              >
                {rewriting === t ? 'Réécriture…' : `≈ ${t} s`}
              </button>
            ))}
          </div>

          {isActive(job) && job && (
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(4, job.progress))}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400">
                {job.step} · {job.progress} %
              </p>
            </div>
          )}

          {rendered && job?.videoUrl && (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={job.videoUrl}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black text-xs font-extrabold"
              >
                <Download size={13} />
                <span>Télécharger le MP4</span>
              </a>
              {job.durationSec !== null && <span className="text-[11px] text-gray-500">{job.durationSec.toFixed(1)} s</span>}
            </div>
          )}

          {job?.status === 'failed' && <p className="text-xs text-red-300">Rendu échoué : {job.error || 'erreur inconnue'}</p>}
          {error && <p className="text-xs text-red-300">{error}</p>}

          {!isActive(job) && !rendered && (
            <button
              type="button"
              onClick={() => void generate()}
              disabled={busy || script.trim().length < 10}
              className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-extrabold disabled:opacity-50"
            >
              {busy ? 'Lancement…' : job?.status === 'failed' ? 'Réessayer' : 'Générer la vidéo'}
            </button>
          )}

          {rendered && job && <p className="text-[11px] text-gray-400">{job.step}</p>}

          {rendered && (
            <button
              type="button"
              onClick={() => void generate(true)}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-white/15 text-white text-xs font-bold hover:bg-white/10 disabled:opacity-40"
            >
              {busy ? 'Lancement…' : 'Recréer la vidéo'}
            </button>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <CopyScriptButton video={{ ...video, script }} />
          </div>
          <p className="text-[10px] text-gray-500">
            Style : {MONTAGES.find((m) => m.id === settings.montage)?.label ?? settings.montage} · format {settings.aspect}
          </p>
        </div>
      </div>
    </article>
  );
};

export const DailyFactory: React.FC<DailyFactoryProps> = ({ uid, profile, onViewProgram }) => {
  const [program, setProgram] = useState<StoredProgram | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(profile.currentProgramId));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renders, setRenders] = useState<RenderJob[]>([]);
  const [settings, setSettings] = useState<RenderSettings>(() => readLocalSettings() ?? DEFAULT_RENDER_SETTINGS);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [overridesLoaded, setOverridesLoaded] = useState(false);
  const [changing, setChanging] = useState(false);
  const [scriptStatus, setScriptStatus] = useState<'idle' | 'generating' | 'ai' | 'model'>('idle');
  const attempted = useRef<string | null>(null);

  const today = toLocalISODate(new Date());

  useEffect(() => {
    let cancelled = false;
    if (!profile.currentProgramId) {
      setProgram(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadProgram(profile.currentProgramId)
      .then((p) => {
        if (!cancelled) setProgram(p);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(err, 'Chargement impossible.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.currentProgramId]);

  // Réglages, scripts modifiés et rendus du jour (chargés à l'ouverture de la page).
  useEffect(() => {
    let cancelled = false;
    getRenderSettings()
      .then(({ settings: remote, saved }) => {
        // Réglages enregistrés sur le serveur : ils priment. Sinon on garde le choix local.
        if (cancelled || !saved) return;
        setSettings(remote);
        writeLocalSettings(remote);
      })
      .catch(() => undefined);
    getScriptOverrides()
      .then((o) => !cancelled && setOverrides(o))
      .catch(() => undefined)
      .finally(() => !cancelled && setOverridesLoaded(true));
    listDayRenders(today)
      .then((jobs) => !cancelled && setRenders(jobs))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [uid, today]);

  const changeSettings = (next: RenderSettings) => {
    setSettings(next);
    writeLocalSettings(next);
    saveRenderSettings(next).catch((err: unknown) => setError(errorText(err, 'Réglages non enregistrés.')));
  };

  // Scripts du jour : Llama écrit les 3 scripts de la journée, une seule fois, puis ils sont enregistrés.
  const todayDayData = program?.days.find((d) => d.date === today) ?? null;
  useEffect(() => {
    if (!program || !todayDayData || !overridesLoaded) return;
    const day = todayDayData;
    const attemptKey = `${program.id}|${day.date}`;
    const keys = day.videos.map((_, i) => `${program.id}|${day.date}|${i}`);
    if (keys.every((k) => overrides[k])) {
      setScriptStatus('ai');
      return;
    }
    if (attempted.current === attemptKey) return;
    attempted.current = attemptKey;
    setScriptStatus('generating');
    (async () => {
      try {
        const niches = Array.from(new Set(day.videos.map((v) => v.niche)));
        const { scripts } = await generateScripts(niches, 3);
        const used = new Map<string, number>();
        const updates: Record<string, string> = {};
        day.videos.forEach((video, i) => {
          const k = used.get(video.niche) ?? 0;
          used.set(video.niche, k + 1);
          const item = scripts[video.niche]?.[k];
          if (item && !overrides[keys[i]]) updates[keys[i]] = scriptFromAI(item);
        });
        // Un enregistrement après l'autre.
        for (const [key, script] of Object.entries(updates)) {
          await saveScriptOverride(key, script);
        }
        setOverrides((prev) => ({ ...prev, ...updates }));
        setScriptStatus(Object.keys(updates).length > 0 ? 'ai' : 'model');
      } catch {
        setScriptStatus('model');
      }
    })();
    // Une seule tentative par journée et par programme : pas de relance automatique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, todayDayData?.date, overridesLoaded]);

  const upsertRender = useCallback((job: RenderJob) => {
    setRenders((prev) => (prev.some((r) => r.id === job.id) ? prev.map((r) => (r.id === job.id ? job : r)) : [job, ...prev]));
  }, []);

  const onScriptSaved = useCallback((key: string, script: string) => {
    setOverrides((prev) => ({ ...prev, [key]: script }));
  }, []);

  // Modifier le programme crée un nouveau programme (les règles interdisent la mise à jour) :
  // les scripts validés des vidéos inchangées sont recopiés vers le nouvel identifiant.
  const commitProgram = async (nextDays: ProgramDay[], nextNiches: NicheId[]) => {
    if (!program) return;
    if (nextNiches.length > 3) {
      setError('Un programme accepte 3 niches au maximum. Retire d’abord une niche déjà utilisée.');
      return;
    }
    setChanging(true);
    setError(null);
    try {
      const totalVideos = totalOf(nextDays);
      const newId = await saveGeneratedProgram(uid, { niches: nextNiches, duration: program.duration, days: nextDays, totalVideos });
      const carried = carryOverrides(program.id, newId, overrides, program.days, nextDays);
      for (const [key, script] of Object.entries(carried)) {
        await saveScriptOverride(key, script);
      }
      attempted.current = null;
      setOverrides(carried);
      setProgram({ ...program, id: newId, niches: nextNiches, days: nextDays, totalVideos });
    } catch (err) {
      setError(errorText(err, 'Modification du programme impossible.'));
    } finally {
      setChanging(false);
    }
  };

  // Une vidéo change de niche (aujourd’hui ou plus tard) : son modèle de script est remplacé.
  const changeVideoNiche = (date: string, index: number, niche: NicheId) => {
    if (!program) return;
    const current = program.days.find((d) => d.date === date)?.videos[index]?.niche;
    if (current === niche) return;
    const nextDays = withNicheForVideo(program.days, date, index, niche, Math.floor(Math.random() * 1000));
    void commitProgram(nextDays, nichesOf(nextDays));
  };

  // Niches du programme : valables à partir de demain.
  const changeProgramNiches = (selected: NicheId[]) => {
    if (!program || selected.length === 0) return;
    const todayIso = toLocalISODate(new Date());
    const nextDays = withProgramNiches(program.days, selected, program.duration, todayIso);
    void commitProgram(nextDays, nichesOf(nextDays));
  };

  // Interroge toutes les 5 s les rendus en cours.
  const activeIds = renders
    .filter((r) => r.status === 'queued' || r.status === 'rendering')
    .map((r) => r.id)
    .join(',');
  useEffect(() => {
    if (!activeIds) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      activeIds.split(',').forEach((id) => {
        getRender(id)
          .then((job) => !cancelled && upsertRender(job))
          .catch(() => undefined);
      });
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeIds, upsertRender]);

  // Recale le programme pour que le jour 1 soit aujourd'hui.
  const startToday = async () => {
    const duration = profile.programDuration;
    if (!profile.niches.length || !duration) {
      setError('Niches ou durée manquantes : recommence l’onboarding.');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const startDate = new Date();
      startDate.setHours(12, 0, 0, 0);
      const generated = generateProgram(profile.niches, duration, startDate);
      await saveGeneratedProgram(uid, { niches: profile.niches, duration, ...generated });
    } catch (err) {
      setError(errorText(err, 'Impossible de démarrer le programme.'));
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto w-8 h-8 rounded-full border-2 border-[#00FFC6] border-t-transparent animate-spin" />
      </div>
    );
  }

  const todayDay = program?.days.find((d) => d.date === today);

  if (!todayDay || !program) {
    const firstDay = program?.days[0];
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <h1 className="text-lg font-black text-white">Rien de prévu aujourd’hui</h1>
        <p className="text-sm text-gray-400">
          {firstDay ? `Ton programme commence le ${formatDay(firstDay.date)}.` : 'Tu n’as pas encore de programme actif.'}
        </p>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <button
          type="button"
          onClick={startToday}
          disabled={starting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black font-extrabold text-sm disabled:opacity-50"
        >
          {starting ? 'Démarrage…' : 'Démarrer programme aujourd’hui'}
        </button>
        <button type="button" onClick={onViewProgram} className="text-xs text-gray-400 hover:text-white">
          Voir le programme complet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Aujourd’hui</p>
          <h1 className="text-lg font-black text-white capitalize">{formatDay(todayDay.date)}</h1>
        </div>
        <button type="button" onClick={onViewProgram} className="text-xs text-[#00FFC6] font-bold hover:underline">
          Programme complet
        </button>
      </div>
      <NichePanel
        niches={nichesOf(program.days)}
        disabled={changing}
        onChange={changeProgramNiches}
      />
      <SettingsPanel settings={settings} onChange={changeSettings} />
      <MediaPanel />
      <InspirationPanel />
      {scriptStatus === 'generating' && (
        <p className="text-xs text-[#00FFC6]">Écriture des 3 scripts du jour par Llama…</p>
      )}
      {scriptStatus === 'model' && (
        <p className="text-xs text-gray-400">Scripts de secours affichés : l’IA n’a pas répondu. Recharge la page plus tard pour réessayer.</p>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
      {todayDay.videos.map((video, i) => {
        const key = `${program.id}|${todayDay.date}|${i}`;
        return (
          <DailyVideoCard
            key={`${todayDay.date}-${i}`}
            video={video}
            date={todayDay.date}
            index={i}
            programId={program.id}
            savedScript={overrides[key] ?? video.script}
            settings={settings}
            renders={renders}
            onRender={upsertRender}
            onScriptSaved={onScriptSaved}
            onNicheChange={(niche) => changeVideoNiche(todayDay.date, i, niche)}
          />
        );
      })}
    </div>
  );
};
