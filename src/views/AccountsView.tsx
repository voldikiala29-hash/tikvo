import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Plus,
  RefreshCw,
  ExternalLink,
  Sliders,
  Sparkles,
  Zap,
  TrendingUp,
  Radio,
} from 'lucide-react';
import { TikTokAccount, NicheData } from '../types/tiktok';

interface AccountsViewProps {
  niche: NicheData;
  onOpenConnectModal: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  niche,
  onOpenConnectModal,
}) => {
  const [accounts, setAccounts] = useState<TikTokAccount[]>(niche.accounts);
  const [autoPostEnabled, setAutoPostEnabled] = useState(true);
  const [removeWatermark, setRemoveWatermark] = useState(true);
  const [antiSpamDelay, setAntiSpamDelay] = useState('4h');

  const toggleAutoPost = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id ? { ...acc, autoPostEnabled: !acc.autoPostEnabled } : acc
      )
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white">Gestion Multi-Comptes TikTok</h1>
            <span className="px-2 py-0.5 rounded-full bg-[#00FFC6]/20 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/30">
              Niche {niche.name} {niche.emoji}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Contrôle centralisé de tes pages TikTok : statut API Direct Post, monitoring shadowban et automatisation de publication.
          </p>
        </div>

        <button
          onClick={onOpenConnectModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black font-extrabold text-xs transition-all hover:opacity-95 shadow-lg shadow-[#00FFC6]/20"
        >
          <Plus size={16} />
          <span>Connecter un nouveau compte</span>
        </button>
      </div>

      {/* Global Auto-Post Engine Configuration */}
      <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sliders size={16} className="text-[#00FFC6]" />
          <span>Moteur d'Automatisation & Publication Sans Contact (Auto-Pilot)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#1A1A27] border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Publication Automatique</p>
              <p className="text-[10px] text-gray-400">Poste à l'heure exacte sans notification</p>
            </div>
            <button
              onClick={() => setAutoPostEnabled(!autoPostEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                autoPostEnabled ? 'bg-[#00FFC6]' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  autoPostEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#1A1A27] border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Suppression Watermark</p>
              <p className="text-[10px] text-gray-400">Nettoyage automatique des métadonnées</p>
            </div>
            <button
              onClick={() => setRemoveWatermark(!removeWatermark)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                removeWatermark ? 'bg-[#7C3AED]' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  removeWatermark ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#1A1A27] border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Délai Anti-Spam Algorithmique</p>
              <p className="text-[10px] text-gray-400">Intervalle de sécurité entre 2 vidéos</p>
            </div>
            <select
              value={antiSpamDelay}
              onChange={(e) => setAntiSpamDelay(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#08080D] border border-white/10 text-xs font-bold text-[#00FFC6] focus:outline-none"
            >
              <option value="2h">2 heures</option>
              <option value="4h">4 heures</option>
              <option value="6h">6 heures</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounts List for this Niche */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white">
          Comptes Liés à la Niche {niche.name} ({accounts.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-[#12121A]/90 border border-white/5 hover:border-[#00FFC6]/30 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Account Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={acc.avatarUrl}
                      alt={acc.handle}
                      className="w-12 h-12 rounded-2xl border border-white/10 object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm">{acc.displayName}</span>
                        <ShieldCheck size={14} className="text-[#00FFC6]" />
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{acc.handle}</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-[#00FFC6]/15 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/30">
                    API Direct Active
                  </span>
                </div>

                {/* Account Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#08080D] border border-white/5 mb-4 text-center">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Abonnés</span>
                    <span className="text-sm font-black text-white">{(acc.followers / 1000).toFixed(1)}k</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Likes</span>
                    <span className="text-sm font-black text-white">{acc.totalLikes}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Engagement</span>
                    <span className="text-sm font-black text-[#00FFC6]">{acc.engagementRate}</span>
                  </div>
                </div>

                {/* Health & Safety Check */}
                <div className="space-y-2 text-xs mb-4">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-[#00FFC6]" />
                      <span>Risque de Shadowban :</span>
                    </span>
                    <span className="font-bold text-[#00FFC6]">0% (Compte Sain)</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#7C3AED]" />
                      <span>Creator Rewards Program :</span>
                    </span>
                    <span className="font-bold text-white">Éligible (€1.10 RPM)</span>
                  </div>
                </div>
              </div>

              {/* Account Controls */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-gray-400">Auto-Post pour ce compte</span>
                <button
                  onClick={() => toggleAutoPost(acc.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    acc.autoPostEnabled
                      ? 'bg-[#00FFC6]/20 text-[#00FFC6] border border-[#00FFC6]/40'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  {acc.autoPostEnabled ? 'Auto-Post Activé' : 'Désactivé'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
