import React, { useState } from 'react';
import {
  X,
  Radio,
  CheckCircle2,
  AlertCircle,
  Key,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { tikTokApiService } from '../services/tiktokApiService';

interface ConnectTikTokModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

export const ConnectTikTokModal: React.FC<ConnectTikTokModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  onConnectionChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'oauth' | 'credentials'>('oauth');
  const [clientKey, setClientKey] = useState(
    localStorage.getItem('TIKTOK_CLIENT_KEY') || 'awq89voldi72x1m'
  );
  const [clientSecret, setClientSecret] = useState(
    localStorage.getItem('TIKTOK_CLIENT_SECRET') || '••••••••••••••••••••••••'
  );
  const [environment, setEnvironment] = useState<'sandbox' | 'live'>('live');

  if (!isOpen) return null;

  const handleSimulateOAuthConnect = async () => {
    setLoading(true);
    try {
      await tikTokApiService.exchangeCodeForToken('auth_code_simulated_' + Date.now());
      onConnectionChange(true);
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 700);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    tikTokApiService.disconnect();
    onConnectionChange(false);
  };

  const handleSaveCredentials = () => {
    localStorage.setItem('TIKTOK_CLIENT_KEY', clientKey);
    localStorage.setItem('TIKTOK_CLIENT_SECRET', clientSecret);
    onConnectionChange(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#12121A] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1A1A27]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.895 2.895 0 0 1 2.31-4.64c.298 0 .588.045.86.128V9.397a6.34 6.34 0 0 0-.86-.059 6.337 6.337 0 0 0-6.337 6.338 6.337 6.337 0 0 0 6.337 6.337 6.337 6.337 0 0 0 6.338-6.337V8.583a8.212 8.212 0 0 0 4.768 1.548v-3.445h-1.001z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Connexion TikTok Business & Direct Post API</h2>
              <p className="text-xs text-gray-400">
                Synchronisation officielle pour poster, analyser et automatiser.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status Banner */}
        <div className="px-6 py-3 bg-[#08080D]/60 border-b border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Statut de la connexion :</span>
            {isConnected ? (
              <span className="flex items-center gap-1.5 font-bold text-[#00FFC6]">
                <CheckCircle2 size={14} /> Connecté (@tikvo_creator_pro)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold text-[#FF2E93]">
                <AlertCircle size={14} /> Non synchronisé
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Mode :</span>
            <div className="flex rounded-lg bg-white/5 p-0.5 text-[10px] font-bold">
              <button
                onClick={() => setEnvironment('live')}
                className={`px-2 py-0.5 rounded-md ${
                  environment === 'live' ? 'bg-[#00FFC6] text-black' : 'text-gray-400'
                }`}
              >
                Production
              </button>
              <button
                onClick={() => setEnvironment('sandbox')}
                className={`px-2 py-0.5 rounded-md ${
                  environment === 'sandbox' ? 'bg-[#7C3AED] text-white' : 'text-gray-400'
                }`}
              >
                Sandbox
              </button>
            </div>
          </div>
        </div>

        {/* Body Tabs */}
        <div className="p-6 space-y-5">
          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1A1A27] border border-[#00FFC6]/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                    alt="Avatar"
                    className="w-12 h-12 rounded-full border-2 border-[#00FFC6]"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm">@tikvo_creator_pro</span>
                      <ShieldCheck size={14} className="text-[#00FFC6]" />
                    </div>
                    <p className="text-xs text-gray-400">TikTok Business Creator Verified</p>
                    <p className="text-[11px] text-[#00FFC6] mt-0.5">Direct Post API : Activé • Auto-Post : Prêt</p>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <LogOut size={13} />
                  <span>Déconnecter</span>
                </button>
              </div>

              {/* Authorized Scopes */}
              <div className="p-4 rounded-xl bg-[#08080D] border border-white/5 space-y-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Autorisations Actives (Scopes TikTok API v2)
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2 text-[#00FFC6]">
                    <CheckCircle2 size={13} /> <span>video.publish (Publication directe)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#00FFC6]">
                    <CheckCircle2 size={13} /> <span>video.upload (Upload automatisé)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#00FFC6]">
                    <CheckCircle2 size={13} /> <span>user.info.stats (Statistiques live)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#00FFC6]">
                    <CheckCircle2 size={13} /> <span>research.adlib (Radar tendances)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[#00FFC6] text-black font-bold text-xs hover:bg-[#00FFC6]/90 transition-all"
              >
                Fermer et retourner au Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center p-4 rounded-2xl bg-gradient-to-b from-[#1A1A27] to-transparent border border-white/5">
                <div className="w-12 h-12 rounded-full bg-[#00FFC6]/10 text-[#00FFC6] mx-auto flex items-center justify-center mb-3">
                  <Sparkles size={24} />
                </div>
                <h3 className="font-black text-white text-base">Autoriser l'accès TikTok en 1 clic</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
                  Connecte ton compte TikTok pour poster automatiquement tes scripts programmés, récupérer les sons viraux en temps réel et suivre tes revenus.
                </p>
              </div>

              <div className="space-y-2 text-xs text-gray-300 bg-[#08080D] p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle2 size={14} className="text-[#00FFC6]" />
                  <span>Publication directe sans passer par l'application mobile</span>
                </div>
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle2 size={14} className="text-[#00FFC6]" />
                  <span>Contournement du shadowban grâce aux métadonnées officielles</span>
                </div>
                <div className="flex items-center gap-2 text-gray-200">
                  <CheckCircle2 size={14} className="text-[#00FFC6]" />
                  <span>Support multi-comptes pour gérer toutes tes niches</span>
                </div>
              </div>

              <button
                onClick={handleSimulateOAuthConnect}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF2E93] via-[#7C3AED] to-[#00FFC6] text-white font-black text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF2E93]/20"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Synchronisation TikTok en cours...</span>
                  </>
                ) : (
                  <>
                    <Radio size={16} />
                    <span>Connecter avec TikTok (OAuth v2)</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-gray-400">
                  Besoin de configurer des clés personnalisées de développeur TikTok ?
                </span>
                <div className="mt-2 text-left space-y-2">
                  <input
                    type="text"
                    value={clientKey}
                    onChange={(e) => setClientKey(e.target.value)}
                    placeholder="TikTok Client Key"
                    className="w-full px-3 py-2 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFC6]"
                  />
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="TikTok Client Secret"
                    className="w-full px-3 py-2 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFC6]"
                  />
                  <button
                    onClick={handleSaveCredentials}
                    className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
                  >
                    Enregistrer les identifiants API
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
