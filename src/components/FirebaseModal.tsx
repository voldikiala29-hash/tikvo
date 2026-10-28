import React, { useState } from 'react';
import {
  X,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  User as UserIcon,
  Zap,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';

export const FirebaseModal: React.FC = () => {
  const {
    user,
    isDemoUser,
    authLoading,
    authError,
    clearAuthError,
    isFirebaseConfigured,
    isFirebaseModalOpen,
    setIsFirebaseModalOpen,
    signInWithGoogle,
    signInAsTester,
    logout,
    testFirestorePing,
    projectId,
    firestoreDatabaseId,
    firestoreCustomNiches,
    firestoreScheduledPosts,
  } = useFirebase();

  const [pingStatus, setPingStatus] = useState<{
    tested: boolean;
    loading: boolean;
    success: boolean;
    latencyMs?: number;
    message?: string;
  }>({
    tested: false,
    loading: false,
    success: false,
  });

  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isFirebaseModalOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'tikvo.store';

  const handleCopyHostname = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleTestPing = async () => {
    setPingStatus({ tested: false, loading: true, success: false });
    const result = await testFirestorePing();
    setPingStatus({
      tested: true,
      loading: false,
      success: result.success,
      latencyMs: result.latencyMs,
      message: result.message,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#12121A] border border-white/10 shadow-2xl shadow-[#00FFC6]/5 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#1A1A27]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00FFC6]/20 to-[#7C3AED]/20 border border-[#00FFC6]/30 flex items-center justify-center text-[#00FFC6]">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Centre Cloud & Firebase</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#00FFC6]/15 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/30">
                  {user ? (isDemoUser ? 'Mode Testeur' : 'Connecté') : 'Prêt'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Synchronisation de vos niches virales et publications automatisées
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              clearAuthError();
              setIsFirebaseModalOpen(false);
            }}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Error Banner if any */}
          {authError && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-300">Information de connexion :</p>
                  <p className="mt-1 text-gray-300 leading-relaxed">{authError}</p>
                </div>
              </div>

              {/* Quick actions for domain whitelisting */}
              {authError.includes('domaine') && (
                <div className="mt-3 pt-3 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono text-[11px] bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-white">
                    <span>{currentHostname}</span>
                    <button
                      onClick={handleCopyHostname}
                      className="text-[#00FFC6] hover:underline flex items-center gap-1 font-sans text-xs ml-2 font-bold"
                    >
                      <Copy size={12} />
                      {copiedDomain ? 'Copié !' : 'Copier le domaine'}
                    </button>
                  </div>
                  <a
                    href={`https://console.firebase.google.com/project/${projectId}/authentication/settings`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#00FFC6] hover:underline font-bold"
                  >
                    <span>Console Firebase</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Active User Card if Connected */}
          {user ? (
            <div className="p-4 rounded-2xl bg-[#1A1A27] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                  Session Active
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#00FFC6] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#00FFC6] animate-pulse"></span>
                  {isDemoUser ? 'Profil Démo Prêt' : 'Authentifié via Google Cloud'}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utilisateur'}
                    className="w-12 h-12 rounded-2xl border-2 border-[#00FFC6]/60 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#00FFC6]/20 text-[#00FFC6] flex items-center justify-center text-lg font-black border border-[#00FFC6]/40">
                    <UserIcon size={24} />
                  </div>
                )}
                <div className="flex-1 truncate">
                  <h4 className="text-sm font-bold text-white truncate">
                    {user.displayName || 'tikvo Creator'}
                  </h4>
                  <p className="text-xs text-gray-400 truncate font-mono">{user.email}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                    UID: {user.uid}
                  </p>
                </div>
              </div>

              {/* Sync Summary */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-center">
                  <span className="text-xs text-gray-400 block">Niches personnalisées</span>
                  <span className="text-sm font-bold text-[#00FFC6]">
                    {Object.keys(firestoreCustomNiches).length} active(s)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-center">
                  <span className="text-xs text-gray-400 block">Posts planifiés</span>
                  <span className="text-sm font-bold text-[#FF2E93]">
                    {firestoreScheduledPosts.length} en attente
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-semibold transition-all border border-red-500/20"
                >
                  <LogOut size={14} />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login Options if not logged in */
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                Options de Connexion
              </h4>

              {/* Primary: Google Popup */}
              <button
                onClick={() => signInWithGoogle()}
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              >
                {authLoading ? (
                  <RefreshCw size={16} className="animate-spin text-gray-900" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {authLoading ? 'Ouverture de la fenêtre Google...' : 'Se connecter avec Google (Compte Cloud)'}
                </span>
              </button>

              {/* Secondary: Instant Tester Mode */}
              <button
                onClick={signInAsTester}
                className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-[#00FFC6]/20 via-[#7C3AED]/20 to-[#FF2E93]/20 hover:from-[#00FFC6]/30 hover:to-[#FF2E93]/30 border border-[#00FFC6]/40 text-white font-bold text-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Sparkles size={16} className="text-[#00FFC6]" />
                <span>Mode Testeur Immédiat (Pour voir & tester tout de suite)</span>
              </button>
              <p className="text-[11px] text-gray-400 text-center px-4">
                Le mode testeur vous permet d'accéder instantanément à toutes les fonctionnalités cloud, à la création de niches et à la planification sans dépendre des restrictions de fenêtres pop-up.
              </p>
            </div>
          )}

          {/* Infrastructure & Database Details */}
          <div className="p-4 rounded-2xl bg-[#08080D] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1.5">
                <Cloud size={14} className="text-[#00FFC6]" />
                Infrastructure Firestore
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                Europe-West2 (London)
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] text-gray-300">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-400">Projet GCP :</span>
                <span className="text-white">{projectId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-400">Base Firestore ID :</span>
                <span className="text-[#00FFC6] truncate max-w-[220px]" title={firestoreDatabaseId}>
                  {firestoreDatabaseId}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400">Sécurité Règles :</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={13} />
                  ABAC Fortress Déployé
                </span>
              </div>
            </div>

            {/* Test Firestore Ping Button */}
            <div className="pt-2">
              <button
                onClick={handleTestPing}
                disabled={pingStatus.loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-all border border-white/10"
              >
                <RefreshCw size={13} className={pingStatus.loading ? 'animate-spin text-[#00FFC6]' : ''} />
                <span>
                  {pingStatus.loading
                    ? 'Test du serveur en cours...'
                    : 'Tester la liaison Firestore (Ping direct)'}
                </span>
              </button>

              {pingStatus.tested && (
                <div
                  className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    pingStatus.success
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {pingStatus.success ? (
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                  )}
                  <span>
                    {pingStatus.success
                      ? `Connexion confirmée avec succès (${pingStatus.latencyMs}ms) - Base accessible !`
                      : pingStatus.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-[#1A1A27]/30 flex justify-between items-center">
          <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <Zap size={13} className="text-[#00FFC6]" />
            tikvo Cloud Sync Engine v2.4
          </span>
          <button
            onClick={() => {
              clearAuthError();
              setIsFirebaseModalOpen(false);
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
