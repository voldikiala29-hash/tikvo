import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { NICHE_CATALOG, NicheId } from '../services/programGenerator';
import { saveNiches } from '../services/factoryStore';

const MAX_NICHES = 3;

interface OnboardingNichesProps {
  uid: string;
  initial: NicheId[];
}

export const OnboardingNiches: React.FC<OnboardingNichesProps> = ({ uid, initial }) => {
  const [selected, setSelected] = useState<NicheId[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: NicheId) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_NICHES) return prev;
      return [...prev, id];
    });
  };

  const submit = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await saveNiches(uid, selected);
      // Le profil se met à jour en direct : l'écran suivant s'affiche tout seul.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Choisis tes niches</h1>
        <p className="text-sm text-gray-400 mt-1">
          1 à {MAX_NICHES} niches. Ton programme sera construit autour de celles-ci.
        </p>
        <p className="text-xs text-[#00FFC6] font-bold mt-2">
          {selected.length}/{MAX_NICHES} sélectionnée{selected.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {NICHE_CATALOG.map((niche) => {
          const isOn = selected.includes(niche.id);
          const isDisabled = !isOn && selected.length >= MAX_NICHES;
          return (
            <button
              key={niche.id}
              type="button"
              onClick={() => toggle(niche.id)}
              disabled={isDisabled}
              aria-pressed={isOn}
              className={`relative p-4 rounded-2xl border text-left transition-all disabled:opacity-40 ${
                isOn
                  ? 'bg-[#00FFC6]/10 border-[#00FFC6] shadow-md shadow-[#00FFC6]/10'
                  : 'bg-[#12121A] border-white/10 hover:border-white/30'
              }`}
            >
              {isOn && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#00FFC6] flex items-center justify-center">
                  <Check size={12} className="text-black" />
                </span>
              )}
              <span className="text-2xl">{niche.emoji}</span>
              <p className="mt-2 text-sm font-bold text-white">{niche.label}</p>
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={selected.length === 0 || saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black font-extrabold text-sm disabled:opacity-40 transition-all"
      >
        {saving ? 'Enregistrement…' : 'Continuer'}
      </button>
    </div>
  );
};
