import React, { useCallback, useEffect, useState } from 'react';
import { Download, Film } from 'lucide-react';
import { CopyScriptButton } from '../components/CopyScriptButton';
import {
  ApiError,
  PexelsPreviewItem,
  RenderJob,
  createRender,
  getRender,
  getRenderSettings,
  getScriptOverrides,
  listDayRenders,
  rewriteScript,
  saveRenderSettings,
  saveScriptOverride,
  searchPexels,
} from '../services/backendApi';
import { StoredProgram, UserProfile, loadProgram, saveGeneratedProgram } from '../services/factoryStore';
import { NICHE_CATALOG, ProgramVideo, generateProgramWithAI, toLocalISODate } from '../services/programGenerator';
import {
  ASPECTS,
  CLIP_CHOICES,
  DEFAULT_RENDER_SETTINGS,
  MONTAGES,
  RenderSettings,
  estimateSeconds,
} from '../video-engine/montage';

interface DailyFactoryProps {
  uid: string;
  profile: UserProfile;
  onViewProgram: () => void;
}

const POLL_MS = 5000;
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
    <section className="rounded-2xl bg-[#12121A] border border-white/5 p-4 space-y-4">
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
        <p className="text-[11px] text-gray-500">{montage.description}</p>
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
}) => {
  const videoKey = `${date}-${index}`;
  const overrideKey = `${programId}|${date}|${index}`;
  const [script, setScript] = useState(savedScript);
  const [rewriting, setRewriting] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await createRender({
        title: video.title,
        hook: video.hook,
        script: script.trim(),
        pexelsQuery: video.pexelsQuery,
        nicheId: video.niche,
        nicheName: nicheLabel(video.niche),
        day: date,
        videoKey,
        settings,
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
          <p className="text-[11px] text-gray-400">Clips : {video.pexelsQuery}</p>

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
              onClick={generate}
              disabled={busy || script.trim().length < 10}
              className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-extrabold disabled:opacity-50"
            >
              {busy ? 'Lancement…' : job?.status === 'failed' ? 'Réessayer' : 'Générer la vidéo'}
            </button>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <CopyScriptButton video={{ ...video, script }} />
          </div>
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
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_RENDER_SETTINGS);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

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
      .then((s) => !cancelled && setSettings(s))
      .catch(() => undefined);
    getScriptOverrides()
      .then((o) => !cancelled && setOverrides(o))
      .catch(() => undefined);
    listDayRenders(today)
      .then((jobs) => !cancelled && setRenders(jobs))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [uid, today]);

  const changeSettings = (next: RenderSettings) => {
    setSettings(next);
    saveRenderSettings(next).catch((err: unknown) => setError(errorText(err, 'Réglages non enregistrés.')));
  };

  const upsertRender = useCallback((job: RenderJob) => {
    setRenders((prev) => (prev.some((r) => r.id === job.id) ? prev.map((r) => (r.id === job.id ? job : r)) : [job, ...prev]));
  }, []);

  const onScriptSaved = useCallback((key: string, script: string) => {
    setOverrides((prev) => ({ ...prev, [key]: script }));
  }, []);

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
      const generated = await generateProgramWithAI(profile.niches, duration, startDate);
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
          {starting ? 'Génération des scripts…' : 'Démarrer programme aujourd’hui'}
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
      <SettingsPanel settings={settings} onChange={changeSettings} />
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
          />
        );
      })}
    </div>
  );
};
