import React, { useEffect, useState } from 'react';
import { Download, Film } from 'lucide-react';
import { CopyScriptButton } from '../components/CopyScriptButton';
import { PexelsPreviewItem, searchPexels } from '../services/backendApi';
import { StoredProgram, UserProfile, loadProgram, saveGeneratedProgram } from '../services/factoryStore';
import { NICHE_CATALOG, ProgramVideo, generateProgram, toLocalISODate } from '../services/programGenerator';

interface DailyFactoryProps {
  uid: string;
  profile: UserProfile;
  onViewProgram: () => void;
}

const nicheLabel = (id: string) => NICHE_CATALOG.find((n) => n.id === id)?.label ?? id;
const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Aperçu vertical réel (Pexels via le Worker). Repli sur un dégradé si rien ne s'affiche. */
const PexelsPreview: React.FC<{ query: string }> = ({ query }) => {
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'empty' | 'error'; video?: PexelsPreviewItem; message?: string }>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    searchPexels(query, 1)
      .then((videos) => {
        if (cancelled) return;
        setState(videos[0] ? { status: 'ok', video: videos[0] } : { status: 'empty' });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : 'Aperçu indisponible.' });
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const frame = 'relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-gradient-to-br from-pink-600 via-purple-700 to-indigo-900';

  if (state.status === 'ok' && state.video) {
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
    <div className={`${frame} flex flex-col items-center justify-center gap-2 text-white/80 p-3 text-center`}>
      {state.status === 'loading' ? (
        <div className="w-6 h-6 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
      ) : (
        <>
          <Film size={28} />
          <span className="text-[10px] leading-snug">
            {state.status === 'empty' ? 'Aucun aperçu trouvé' : state.message || 'Aperçu indisponible'}
          </span>
        </>
      )}
    </div>
  );
};

const DailyVideoCard: React.FC<{ video: ProgramVideo; date: string; index: number }> = ({ video, date, index }) => {
  const download = () => {
    const content = [
      video.title,
      '',
      `Accroche : ${video.hook}`,
      '',
      video.script,
      '',
      `Requête vidéo : ${video.pexelsQuery}`,
      `Horaire conseillé : ${video.time}`,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `tikvo-${date}-${video.time.replace(':', 'h')}-${index + 1}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="rounded-2xl bg-[#12121A] border border-white/5 p-4 grid gap-4 md:grid-cols-[160px_1fr]">
      <PexelsPreview query={video.pexelsQuery} />
      <div className="min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-[#00FFC6] bg-[#00FFC6]/10 px-2 py-0.5 rounded">
            {video.time} · {nicheLabel(video.niche)}
          </span>
          <span className="text-[10px] text-gray-500">Vidéo {index + 1}/3</span>
        </div>
        <h3 className="text-sm font-bold text-white">{video.title}</h3>
        <p className="text-[11px] text-gray-400">Requête Pexels : {video.pexelsQuery}</p>
        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{video.script}</pre>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={download}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black text-xs font-extrabold"
          >
            <Download size={13} />
            <span>Télécharger</span>
          </button>
          <CopyScriptButton video={video} />
        </div>
        <p className="text-[10px] text-gray-500">Fichier script (.txt) pour l’instant ; le MP4 arrive avec le moteur de rendu.</p>
      </div>
    </article>
  );
};

export const DailyFactory: React.FC<DailyFactoryProps> = ({ uid, profile, onViewProgram }) => {
  const [program, setProgram] = useState<StoredProgram | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(profile.currentProgramId));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const today = toLocalISODate(new Date());
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
        <DailyVideoCard key={`${todayDay.date}-${i}`} video={video} date={todayDay.date} index={i} />
      ))}
    </div>
  );
};
