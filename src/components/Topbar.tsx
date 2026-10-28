import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  Plus,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Zap,
  LogOut,
} from 'lucide-react';
import { NicheData, NicheId } from '../types/tiktok';
import { useFirebase } from '../contexts/FirebaseContext';

interface TopbarProps {
  selectedNiche: NicheId;
  setSelectedNiche: (nicheId: NicheId) => void;
  niches: Record<string, NicheData>;
  onOpenCustomNicheModal: () => void;
  onGenerate10Ideas: () => void;
  isTikTokConnected: boolean;
  onOpenConnectModal: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  selectedNiche,
  setSelectedNiche,
  niches,
  onOpenCustomNicheModal,
  onGenerate10Ideas,
  isTikTokConnected,
  onOpenConnectModal,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const currentNiche = niches[selectedNiche] || niches.mode;
  const { user, signInWithGoogle, logout, isFirebaseConfigured } = useFirebase();

  return (
    <header className="h-16 border-b border-white/5 bg-[#08080D]/90 backdrop-blur-xl sticky top-0 z-20 px-6 flex items-center justify-between ml-64">
      {/* Left side: Niche Selector Dropdown */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#12121A] border border-white/10 hover:border-[#00FFC6]/40 transition-all text-sm font-semibold text-white shadow-sm"
          >
            <span className="text-xl">{currentNiche.emoji}</span>
            <div className="text-left">
              <span className="text-xs text-gray-400 block -mb-0.5 font-normal">Niche active :</span>
              <span className="font-bold text-white text-sm">{currentNiche.name}</span>
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ml-1 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />

              {/* Menu */}
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#12121A] border border-white/10 shadow-2xl shadow-black/80 p-2 z-20 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Changer de Niche TikTok
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                  {Object.values(niches).map((n) => {
                    const isSelected = selectedNiche === n.id;
                    return (
                      <button
                        key={n.id}
                        onClick={() => {
                          setSelectedNiche(n.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#00FFC6]/15 to-transparent text-white border-l-2 border-[#00FFC6] font-bold'
                            : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-lg">{n.emoji}</span>
                          <span className="truncate">{n.name}</span>
                        </div>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC6]"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenCustomNicheModal();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED]/20 to-[#FF2E93]/20 hover:from-[#7C3AED]/30 hover:to-[#FF2E93]/30 border border-[#7C3AED]/30 text-white text-xs font-semibold transition-all"
                  >
                    <Plus size={14} className="text-[#00FFC6]" />
                    <span>Ajouter une niche custom</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Real-time Niche Tagline */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400 pl-2 border-l border-white/10">
          <Zap size={14} className="text-[#00FFC6] animate-pulse" />
          <span className="truncate max-w-sm">{currentNiche.tagline}</span>
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Generate 10 Viral Ideas CTA Button */}
        <button
          onClick={onGenerate10Ideas}
          className="relative group overflow-hidden px-4 py-2 rounded-xl bg-gradient-to-r from-[#00FFC6] via-[#7C3AED] to-[#FF2E93] p-[1.5px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#00FFC6]/10"
        >
          <div className="w-full h-full bg-[#08080D] group-hover:bg-[#08080D]/80 rounded-[10px] px-3.5 py-1.5 flex items-center gap-2 transition-all">
            <Sparkles size={15} className="text-[#00FFC6] group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold text-white tracking-wide">
              Générer 10 idées virales pour {currentNiche.name}
            </span>
            <span className="text-xs">{currentNiche.emoji}</span>
          </div>
        </button>

        {/* Connect TikTok Button */}
        <button
          onClick={onOpenConnectModal}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
            isTikTokConnected
              ? 'bg-[#12121A] text-[#00FFC6] border-[#00FFC6]/40 hover:bg-[#00FFC6]/10'
              : 'bg-[#FF2E93] text-white border-transparent hover:bg-[#FF2E93]/90 shadow-md shadow-[#FF2E93]/20'
          }`}
        >
          {isTikTokConnected ? (
            <>
              <CheckCircle2 size={15} className="text-[#00FFC6]" />
              <span className="hidden sm:inline">TikTok Connecté</span>
            </>
          ) : (
            <>
              <Radio size={14} className="animate-pulse" />
              <span>Connecter TikTok</span>
            </>
          )}
        </button>

        {/* Firebase Auth & Cloud Sync */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#1A1A27] border border-white/10">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-6 h-6 rounded-full border border-[#00FFC6]/50 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#00FFC6]/20 text-[#00FFC6] flex items-center justify-center text-[10px] font-black">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden xl:block text-left">
                <span className="text-[11px] font-bold text-white block max-w-[90px] truncate leading-tight">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <span className="text-[9px] text-[#00FFC6] flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC6] animate-pulse"></span>
                  Cloud Sync
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Déconnexion Firebase"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-xs"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            title={isFirebaseConfigured ? "Connexion Google / Cloud Sync" : "Configuration Firebase manquante (mode local actif)"}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#12121A] hover:bg-white/5 border border-white/15 text-white text-xs font-bold transition-all shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span className="hidden sm:inline">
              {isFirebaseConfigured ? 'Firebase Auth' : 'Mode Local'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
