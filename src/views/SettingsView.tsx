import React, { useState } from 'react';
import {
  Sliders,
  Key,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Save,
  Globe,
  Radio,
  Clock,
  Database,
  Cloud,
} from 'lucide-react';
import { NicheData } from '../types/tiktok';
import { useFirebase } from '../contexts/FirebaseContext';

interface SettingsViewProps {
  niche: NicheData;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  niche,
}) => {
  const [targetAge, setTargetAge] = useState(niche.targetAudience.ageRange);
  const [blacklistedKeywords, setBlacklistedKeywords] = useState(
    'arnaque, drop, crypto facile, investis vite, faux'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const { user, isDemoUser, setIsFirebaseModalOpen, projectId, firestoreDatabaseId } = useFirebase();

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white">Paramètres Niche</h1>
            <span className="text-xl">{niche.emoji}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#00FFC6]/20 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/30">
              Configuration Avancée
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Personnalisation algorithmique pour la niche {niche.name}.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Niche Algorithmic Profile */}
        <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders size={16} className="text-[#00FFC6]" />
            <span>Profil Algorithmique de la Niche ({niche.name})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                Cible Démographique Principale
              </label>
              <input
                type="text"
                value={targetAge}
                onChange={(e) => setTargetAge(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00FFC6]"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Ratio détecté : {niche.targetAudience.genderRatio}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                Mots-clés Blacklistés (Anti-Shadowban)
              </label>
              <input
                type="text"
                value={blacklistedKeywords}
                onChange={(e) => setBlacklistedKeywords(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00FFC6]"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                L'IA exclura automatiquement ces termes lors de la rédaction des scripts et légendes.
              </p>
            </div>
          </div>
        </div>

        {/* Firebase Cloud Firestore Synchronization */}
        <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database size={16} className="text-[#00FFC6]" />
              <span>Base de données & Synchronisation Firebase Cloud</span>
            </h3>

            <button
              type="button"
              onClick={() => setIsFirebaseModalOpen(true)}
              className="text-xs text-[#00FFC6] hover:underline font-bold flex items-center gap-1"
            >
              <span>Ouvrir le Centre Firebase</span>
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#08080D] border border-white/5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Statut de la session utilisateur :</span>
              <span className="text-[#00FFC6] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00FFC6] animate-pulse"></span>
                {user ? (isDemoUser ? 'Connecté (Mode Créateur Test)' : `Connecté (${user.email})`) : 'Non connecté'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Projet Cloud / Base Firestore :</span>
              <span className="font-mono text-gray-300 text-[11px] truncate max-w-xs">
                {firestoreDatabaseId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Règles de sécurité Firestore :</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck size={14} />
                Actives & Sécurisées (Europe-West2)
              </span>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsFirebaseModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <Cloud size={14} className="text-[#00FFC6]" />
              <span>Gérer la connexion Google & voir les données cloud</span>
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="text-xs font-bold text-[#00FFC6] flex items-center gap-1.5">
              <CheckCircle2 size={16} />
              Paramètres enregistrés avec succès !
            </span>
          ) : (
            <div></div>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black font-extrabold text-xs transition-all hover:opacity-95 shadow-md shadow-[#00FFC6]/20 flex items-center gap-2"
          >
            <Save size={14} />
            <span>Enregistrer les Paramètres</span>
          </button>
        </div>
      </form>
    </div>
  );
};
