import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { PROGRAM_DURATIONS, ProgramDuration as Duration, VIDEOS_PER_DAY } from '../services/programGenerator';
import { saveDuration, setOnboardingStep } from '../services/factoryStore';

interface ProgramDurationProps {
  uid: string;
}

const ORDER: Duration[] = ['1week', '2weeks', '1month'];

export const ProgramDurationView: React.FC<ProgramDurationProps> = ({ uid }) => {
  const [selected, setSelected] = useState<Duration | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await saveDuration(uid, selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
      setSaving(false);
    }
  };

  const back = async () => {
    try {
      await setOnboardingStep(uid, 'niches');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retour impossible.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button type="button" onClick={back} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> Modifier mes niches
        </button>
        <h1 className="text-xl font-black text-white">Combien de temps veux-tu tenir ?</h1>
        <p className="text-sm text-gray-400 mt-1">{VIDEOS_PER_DAY} vidéos par jour, prêtes à télécharger.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ORDER.map((key) => {
          const cfg = PROGRAM_DURATIONS[key];
          const isOn = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-pressed={isOn}
              className={`relative p-5 rounded-2xl border text-left transition-all ${
                isOn ? 'bg-[#00FFC6]/10 border-[#00FFC6]' : 'bg-[#12121A] border-white/10 hover:border-white/30'
              }`}
            >
              {isOn && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#00FFC6] flex items-center justify-center">
                  <Check size={12} className="text-black" />
                </span>
              )}
              <p className="text-lg font-black text-white">{cfg.label}</p>
              <p className="text-sm text-[#00FFC6] font-bold mt-1">{cfg.videos} vidéos</p>
              <p className="text-xs text-gray-400 mt-1">{cfg.days} jours · {VIDEOS_PER_DAY} par jour</p>
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!selected || saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black font-extrabold text-sm disabled:opacity-40 transition-all"
      >
        {saving ? 'Enregistrement…' : 'Créer mon programme'}
      </button>
    </div>
  );
};
