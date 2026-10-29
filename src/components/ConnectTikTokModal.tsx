import React, { useEffect, useState } from 'react';
import { X, Radio, CheckCircle2, AlertCircle, ShieldCheck, LogOut, RefreshCw } from 'lucide-react';
import { ApiError, backend, forgetSession, isApiConfigured, Me, startTikTokLogin } from '../services/backendApi';

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
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Charge le profil réel quand la fenêtre s'ouvre avec une session.
  useEffect(() => {
    if (!isOpen || !isConnected) {
      setMe(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    backend
      .me()
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onConnectionChange(false);
        }
        setError(err instanceof Error ? err.message : 'Impossible de charger le compte.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isConnected]);

  if (!isOpen) return null;

  const handleLogin = () => {
    setError(null);
    try {
      startTikTokLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    setLoading(true);
    try {
      await backend.disconnect();
    } catch (err) {
      // Session déjà expirée côté serveur : on oublie quand même la session locale.
      forgetSession();
      setError(err instanceof Error ? err.message : 'Déconnexion partielle.');
    } finally {
      setLoading(false);
      onConnectionChange(false);
    }
  };

  const statusLabel = isConnected
    ? me
      ? `Connecté (@${me.username || me.displayName})`
      : 'Connecté'
    : 'Non synchronisé';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#12121A] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1A1A27]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.895 2.895 0 0 1 2.31-4.64c.298 0 .588.045.86.128V9.397a6.34 6.34 0 0 0-.86-.059 6.337 6.337 0 0 0-6.337 6.338 6.337 6.337 0 0 0 6.337 6.337 6.337 6.337 0 0 0 6.338-6.337V8.583a8.212 8.212 0 0 0 4.768 1.548v-3.445h-1.001z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Connexion TikTok</h2>
              <p className="text-xs text-gray-400">Autorise tikvo à publier tes vidéos sur ton compte.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-3 bg-[#08080D]/60 border-b border-white/5 flex items-center gap-2 text-xs">
          <span className="text-gray-400">Statut :</span>
          {isConnected ? (
            <span className="flex items-center gap-1.5 font-bold text-[#00FFC6]">
              <CheckCircle2 size={14} /> {statusLabel}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-[#FF2E93]">
              <AlertCircle size={14} /> {statusLabel}
            </span>
          )}
          {loading && <RefreshCw size={12} className="animate-spin text-gray-400 ml-2" />}
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>
          )}

          {!isApiConfigured() && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              Le serveur tikvo n'est pas encore configuré pour ce site (variable VITE_API_URL).
            </div>
          )}

          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1A1A27] border border-[#00FFC6]/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {me?.avatarUrl ? (
                    <img src={me.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-[#00FFC6] shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#00FFC6]/10 border-2 border-[#00FFC6]/40 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm truncate">
                        {me ? `@${me.username || me.displayName}` : '…'}
                      </span>
                      <ShieldCheck size={14} className="text-[#00FFC6] shrink-0" />
                    </div>
                    {me?.stats && (
                      <p className="text-[11px] text-gray-400">
                        {me.stats.followers.toLocaleString('fr-FR')} abonnés · {me.stats.videos} vidéos
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
                >
                  <LogOut size={13} />
                  <span>Déconnecter</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#08080D] border border-white/5 space-y-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Autorisations accordées</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(me?.scopes ?? []).map((scope) => (
                    <div key={scope} className="flex items-center gap-2 text-[#00FFC6]">
                      <CheckCircle2 size={13} /> <span>{scope}</span>
                    </div>
                  ))}
                </div>
                {me && !me.canPublish && (
                  <p className="text-xs text-amber-300 pt-2">
                    La publication n'est pas autorisée : reconnecte TikTok et accepte l'accès à la publication de vidéos.
                  </p>
                )}
              </div>

              <p className="text-[11px] text-gray-400">
                Tant que l'app tikvo n'a pas été validée par TikTok (audit), les vidéos ne peuvent être publiées qu'en privé.
              </p>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[#00FFC6] text-black font-bold text-xs hover:bg-[#00FFC6]/90 transition-all"
              >
                Fermer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center p-4 rounded-2xl bg-gradient-to-b from-[#1A1A27] to-transparent border border-white/5">
                <div className="w-12 h-12 rounded-full bg-[#00FFC6]/10 text-[#00FFC6] mx-auto flex items-center justify-center mb-3">
                  <Radio size={22} />
                </div>
                <h3 className="font-black text-white text-base">Connecte ton compte TikTok</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
                  Tu seras redirigé vers TikTok pour accepter les autorisations. tikvo ne voit jamais ton mot de passe.
                </p>
              </div>

              <button
                onClick={handleLogin}
                disabled={!isApiConfigured()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF2E93] via-[#7C3AED] to-[#00FFC6] text-white font-black text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF2E93]/20 disabled:opacity-50"
              >
                <Radio size={16} />
                <span>Connecter avec TikTok</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
