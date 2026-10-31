import React, { useCallback, useEffect, useState } from 'react';
import { Download, Film } from 'lucide-react';
import { CopyScriptButton } from '../components/CopyScriptButton';
import {
  ApiError,
  PexelsPreviewItem,
  RenderDuration,
  RenderJob,
  createRender,
  getRender,
  listDayRenders,
  searchPexels,
} from '../services/backendApi';
import { StoredProgram, UserProfile, loadProgram, saveGeneratedProgram } from '../services/factoryStore';
import { NICHE_CATALOG, ProgramVideo, generateProgramWithAI, toLocalISODate } from '../services/programGenerator';

interface DailyFactoryProps {
  uid: string;
  profile: UserProfile;
  onViewProgram: () => void;
}

const DURATIONS: RenderDuration[] = [15, 30, 60];
const POLL_MS = 5000;

const nicheLabel = (id: string) => NICHE_CATALOG.find((n) => n.id === id)?.label ?? id;
const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const isActive = (job: RenderJob | null | undefined) => !!job && (job.status === 'queued' || job.status === 'rendering');

type PreviewState =
  | { status: 'loading' }
  | { status: 'ok'; video: PexelsPreviewItem }
  | { status: 'empty' }
  | { status: 'rate_limited'; message: string }
  | { status: 'error'; message: string };

/** Aperçu vertical réel (clip Pixabay via le Worker). Décalé pour rester sous la limite du fournisseur. */
const ClipPreview: React.FC<{ query: string; delayMs: number }> = ({ query, delayMs }) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PreviewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    const timer = window.setTimeout(() => {
      searchPexels(query, 1)
        .then((videos) => {
          if (cancelled) return;
          setState(videos[0] ? { status: 'ok', video: videos[0] } : { status: 'empty' });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (err instanceof ApiError && err.code === 'PIXABAY_429') {
            setState({ status: 'rate_limited', message: err.message });
          } else {
            setState({ status: 'error', message: err instanceof Error ? err.message : 'Aperçu indisponible.' });
          }
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
      {state.status === 'error' && (
        <>
          <Film size={28} />
          <span className="text-[10px] leading-snug">{state.message}</span>
        </>
      )}
      {state.status === 'rate_limited' && (
        <>
          <Film size={28} />
          <span className="text-[10px] leading-snug">{state.message}</span>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="mt-1 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold"
          >
            Réessayer
          </button>
        </>
      )}
    </div>
  );
};

interface DailyVideoCardProps {
  video: ProgramVideo;
  date: string;
  index: number;
  renders: RenderJob[];
  onRender: (job: RenderJob) => void;
}

const DailyVideoCard: React.FC<DailyVideoCardProps> = ({ video, date, index, renders, onRender }) => {
  const videoKey = `${date}-${index}`;
  const [duration, setDuration] = useState<RenderDuration>(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dernier rendu connu pour cette vidéo à cette durée (la liste est du plus récent au plus ancien).
  const job = renders.find((r) => r.videoKey === videoKey && r.duration === duration) ?? null;
  const rendered = job?.status === 'rendered' && !!job.videoUrl;

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await createRender({
        title: video.title,
        hook: video.hook,
        script: video.script,
        pexelsQuery: video.pexelsQuery,
        nicheId: video.niche,
        nicheName: nicheLabel(video.niche),
        day: date,
        videoKey,
        duration,
      });
      onRender(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lancement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl bg-[#12121A] border border-white/5 p-4 grid gap-4 md:grid-cols-[160px_1fr]">
      {rendered && job?.videoUrl ? (
        <video
          key={job.id}
          src={job.videoUrl}
          controls
          playsInline
          className="w-full aspect-[9/16] rounded-xl bg-black object-cover"
        />
      ) : (
        <ClipPreview query={video.pexelsQuery} delayMs={index * 500} />
      )}
      <div className="min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-[#00FFC6] bg-[#00FFC6]/10 px-2 py-0.5 rounded">
            {video.time} · {nicheLabel(video.niche)}
          </span>
          <span className="text-[10px] text-gray-500">Vidéo {index + 1}/3</span>
        </div>
        <h3 className="text-sm font-bold text-white">{video.title}</h3>
        <p className="text-[11px] text-gray-400">Clips : {video.pexelsQuery}</p>
        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{video.script}</pre>

        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Durée de la vidéo">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={duration === d}
              onClick={() => setDuration(d)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                duration === d ? 'border-[#00FFC6] text-[#00FFC6] bg-[#00FFC6]/10' : 'border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {d} s
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
            disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-extrabold disabled:opacity-50"
          >
            {busy ? 'Lancement…' : job?.status === 'failed' ? 'Réessayer' : `Générer MP4 ${duration} s`}
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <CopyScriptButton video={video} />
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Chargement impossible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.currentProgramId]);

  // Rendus déjà lancés aujourd'hui (rechargés à l'ouverture de la page).
  useEffect(() => {
    let cancelled = false;
    listDayRenders(today)
      .then((jobs) => {
        if (!cancelled) setRenders(jobs);
      })
      .catch(() => {
        /* pas de rendu affiché si le serveur est injoignable : les cartes restent utilisables */
      });
    return () => {
      cancelled = true;
    };
  }, [uid, today]);

  const upsertRender = useCallback((job: RenderJob) => {
    setRenders((prev) => (prev.some((r) => r.id === job.id) ? prev.map((r) => (r.id === job.id ? job : r)) : [job, ...prev]));
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
          .then((job) => {
            if (!cancelled) upsertRender(job);
          })
          .catch(() => {
            /* un échec ponctuel se rattrape au tick suivant */
          });
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
      setError(err instanceof Error ? err.message : 'Impossible de démarrer le programme.');
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

  if (!todayDay) {
    const firstDay = program?.days[0];
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <h1 className="text-lg font-black text-white">Rien de prévu aujourd’hui</h1>
        <p className="text-sm text-gray-400">
          {firstDay
            ? `Ton programme commence le ${formatDay(firstDay.date)}.`
            : 'Tu n’as pas encore de programme actif.'}
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
      {error && <p className="text-xs text-red-300">{error}</p>}
      {todayDay.videos.map((video, i) => (
        <DailyVideoCard
          key={`${todayDay.date}-${i}`}
          video={video}
          date={todayDay.date}
          index={i}
          renders={renders}
          onRender={upsertRender}
        />
      ))}
    </div>
  );
};
