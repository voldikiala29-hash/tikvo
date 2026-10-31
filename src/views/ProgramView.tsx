import React, { useEffect, useRef, useState } from 'react';
import { CopyScriptButton } from '../components/CopyScriptButton';
import {
  NICHE_CATALOG,
  PROGRAM_DURATIONS,
  ProgramDay,
  ProgramVideo,
  generateProgram,
  toLocalISODate,
} from '../services/programGenerator';
import {
  StoredProgram,
  UserProfile,
  loadProgram,
  saveGeneratedProgram,
  setOnboardingStep,
} from '../services/factoryStore';

interface ProgramViewProps {
  uid: string;
  profile: UserProfile;
}

type Status = 'loading' | 'generating' | 'ready' | 'error';

const nicheLabel = (id: string) => NICHE_CATALOG.find((n) => n.id === id)?.label ?? id;
const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const VideoRow: React.FC<{ video: ProgramVideo; index: number }> = ({ video, index }) => (
  <div className="p-4 rounded-xl bg-[#08080D] border border-white/5 space-y-2">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-bold text-[#00FFC6] bg-[#00FFC6]/10 px-2 py-0.5 rounded">
        {video.time} · vidéo {index + 1}
      </span>
      <CopyScriptButton video={video} />
    </div>
    <p className="text-sm font-bold text-white">{video.title}</p>
    <p className="text-[11px] text-gray-400">Sujet : {video.hook} · {nicheLabel(video.niche)}</p>
    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{video.script}</pre>
  </div>
);

export const ProgramView: React.FC<ProgramViewProps> = ({ uid, profile }) => {
  const [program, setProgram] = useState<StoredProgram | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [showToday, setShowToday] = useState(false);
  const generatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Étape « generating » : on génère et on enregistre une seule fois.
      if (profile.onboardingStep === 'generating') {
        if (generatingRef.current) return;
        if (!profile.niches.length || !profile.programDuration) {
          setStatus('error');
          setError('Niches ou durée manquantes : recommence l’onboarding.');
          return;
        }
        generatingRef.current = true;
        setStatus('generating');
        try {
          // Pas d'IA à la création : les scripts du jour sont générés à l'ouverture de chaque journée.
          const generated = generateProgram(profile.niches, profile.programDuration);
          const id = await saveGeneratedProgram(uid, {
            niches: profile.niches,
            duration: profile.programDuration,
            ...generated,
          });
          const stored = await loadProgram(id);
          if (!cancelled) {
            setProgram(stored);
            setStatus(stored ? 'ready' : 'error');
            if (!stored) setError('Programme enregistré mais introuvable.');
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Génération impossible.');
            setStatus('error');
          }
        }
        return;
      }

      if (profile.currentProgramId) {
        setStatus('loading');
        try {
          const stored = await loadProgram(profile.currentProgramId);
          if (!cancelled) {
            setProgram(stored);
            setStatus(stored ? 'ready' : 'error');
            setError(stored ? null : 'Programme introuvable.');
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Chargement impossible.');
            setStatus('error');
          }
        }
        return;
      }

      setStatus('error');
      setError('Aucun programme pour le moment.');
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.onboardingStep, profile.currentProgramId, uid]);

  if (status === 'loading' || status === 'generating') {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="mx-auto w-8 h-8 rounded-full border-2 border-[#00FFC6] border-t-transparent animate-spin" />
        <p className="text-sm text-gray-300">
          {status === 'generating' ? 'Création de ton programme…' : 'Chargement de ton programme…'}
        </p>
      </div>
    );
  }

  if (status === 'error' || !program) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <p className="text-sm text-red-300">{error || 'Une erreur est survenue.'}</p>
        <button
          type="button"
          onClick={() => setOnboardingStep(uid, 'niches').catch(() => undefined)}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold"
        >
          Recommencer l’onboarding
        </button>
      </div>
    );
  }

  const todayIso = toLocalISODate(new Date());
  const todayDay: ProgramDay | undefined = program.days.find((d) => d.date === todayIso);
  const firstDay = program.days[0];
  const durationLabel = PROGRAM_DURATIONS[program.duration]?.label ?? program.duration;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="p-6 rounded-2xl bg-[#12121A] border border-white/5 space-y-3">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ton programme</p>
        <h1 className="text-xl font-black text-white">
          {durationLabel} · {program.totalVideos} vidéos
        </h1>
        <div className="flex flex-wrap gap-2">
          {program.niches.map((id) => (
            <span key={id} className="px-2.5 py-1 rounded-full bg-[#00FFC6]/10 text-[#00FFC6] text-xs font-bold border border-[#00FFC6]/30">
              {nicheLabel(id)}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowToday((v) => !v)}
          className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black font-extrabold text-xs"
        >
          {showToday ? 'Masquer aujourd’hui' : 'Voir mes 3 vidéos d’aujourd’hui'}
        </button>

        {showToday && (
          <div className="space-y-3 pt-2">
            {todayDay ? (
              todayDay.videos.map((v, i) => <VideoRow key={`today-${i}`} video={v} index={i} />)
            ) : (
              <p className="text-xs text-gray-300">
                Rien de prévu aujourd’hui.
                {firstDay ? ` Ton programme commence le ${formatDay(firstDay.date)}.` : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {program.days.map((day, dayIndex) => (
        <section key={day.date} className="space-y-3">
          <h2 className="text-sm font-bold text-white capitalize">
            Jour {dayIndex + 1} · {formatDay(day.date)}
            {day.date === todayIso && <span className="ml-2 text-[#00FFC6]">(aujourd’hui)</span>}
          </h2>
          {day.videos.map((video, i) => (
            <VideoRow key={`${day.date}-${i}`} video={video} index={i} />
          ))}
        </section>
      ))}
    </div>
  );
};
