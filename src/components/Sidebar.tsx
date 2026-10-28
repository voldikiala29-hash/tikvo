import React from 'react';
import {
  LayoutDashboard,
  Users,
  Flame,
  Sparkles,
  Calendar,
  DollarSign,
  Sliders,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { NicheData, NicheId } from '../types/tiktok';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedNiche: NicheId;
  setSelectedNiche: (nicheId: NicheId) => void;
  niches: Record<string, NicheData>;
  onOpenCustomNicheModal: () => void;
  isTikTokConnected: boolean;
  onOpenConnectModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  selectedNiche,
  setSelectedNiche,
  niches,
  onOpenCustomNicheModal,
  isTikTokConnected,
  onOpenConnectModal,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'accounts', label: 'Comptes TikTok', icon: Users, badge: 'Multi' },
    { id: 'radar', label: 'Radar Viral', icon: Flame, badge: 'HOT', isHot: true },
    { id: 'factory', label: 'Content Factory', icon: Sparkles, badge: 'IA' },
    { id: 'calendar', label: 'Calendrier', icon: Calendar, badge: null },
    { id: 'monetization', label: 'Monétisation', icon: DollarSign, badge: 'Shop' },
    { id: 'settings', label: 'Paramètres Niche', icon: Sliders, badge: null },
  ];

  const currentNicheObj = niches[selectedNiche] || niches.mode;

  return (
    <aside className="w-64 bg-[#12121A]/95 border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-30 select-none backdrop-blur-xl">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00FFC6] via-[#7C3AED] to-[#FF2E93] p-[2px] shadow-lg shadow-[#00FFC6]/20">
            <div className="w-full h-full bg-[#08080D] rounded-[10px] flex items-center justify-center">
              <span className="text-xl font-black bg-gradient-to-r from-[#00FFC6] to-[#FF2E93] bg-clip-text text-transparent">
                V
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-white">Tikokvoldi</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[#FF2E93]/20 text-[#FF2E93] border border-[#FF2E93]/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium truncate max-w-[150px]">
              Universal Viral Manager
            </p>
          </div>
        </div>

        {/* Current Active Niche Pill */}
        <div className="mt-4 p-2.5 rounded-xl bg-[#1A1A27]/80 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-xl">{currentNicheObj.emoji}</span>
            <div className="truncate">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Niche Active</p>
              <p className="text-xs font-bold text-white truncate">{currentNicheObj.name}</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#00FFC6] animate-pulse"></span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Navigation Principale
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-[#7C3AED]/25 to-transparent text-white border-l-2 border-[#00FFC6] pl-3.5 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={17}
                  className={`transition-colors ${
                    isActive
                      ? 'text-[#00FFC6]'
                      : 'text-gray-400 group-hover:text-gray-200'
                  }`}
                />
                <span className={isActive ? 'font-semibold text-white' : ''}>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md ${
                    item.isHot
                      ? 'bg-[#FF2E93]/20 text-[#FF2E93] border border-[#FF2E93]/40 animate-pulse'
                      : isActive
                      ? 'bg-[#00FFC6]/20 text-[#00FFC6] border border-[#00FFC6]/30'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Niches Actives Section */}
        <div className="pt-5 pb-2 px-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Niches Actives ({Object.keys(niches).length})
          </span>
        </div>

        <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
          {Object.values(niches).map((n) => {
            const isSelected = selectedNiche === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setSelectedNiche(n.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  isSelected
                    ? 'bg-[#1A1A27] text-white border border-[#00FFC6]/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm">{n.emoji}</span>
                  <span className={`truncate text-[11px] ${isSelected ? 'font-bold text-[#00FFC6]' : ''}`}>
                    {n.name}
                  </span>
                </div>
                {isSelected ? (
                  <span className="text-[10px] font-semibold text-[#00FFC6] bg-[#00FFC6]/10 px-1 rounded">
                    Actif
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 opacity-60">
                    {n.kpis.viralityRate}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Add custom niche button */}
        <button
          onClick={onOpenCustomNicheModal}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-white/15 hover:border-[#00FFC6]/50 bg-white/[0.01] hover:bg-[#00FFC6]/5 text-gray-300 hover:text-[#00FFC6] text-xs font-medium transition-all"
        >
          <PlusCircle size={14} />
          <span>Ajouter une niche custom</span>
        </button>
      </div>

      {/* Bottom API & Account Status Card */}
      <div className="p-3 border-t border-white/5 bg-[#0D0D15]/80">
        <div
          onClick={onOpenConnectModal}
          className="p-3 rounded-xl bg-[#1A1A27]/90 border border-white/5 hover:border-[#00FFC6]/30 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              TikTok API
            </span>
            <div className="flex items-center gap-1">
              {isTikTokConnected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC6] animate-ping"></span>
                  <span className="text-[10px] font-bold text-[#00FFC6]">Connecté</span>
                </>
              ) : (
                <>
                  <AlertCircle size={10} className="text-[#FF2E93]" />
                  <span className="text-[10px] font-bold text-[#FF2E93]">Déconnecté</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-300">
            <div className="truncate">
              <p className="font-medium text-white truncate text-[11px]">
                {isTikTokConnected ? '@voldi_creator_pro' : 'Connexion requise'}
              </p>
              <p className="text-[9px] text-gray-400">
                {isTikTokConnected ? 'Auto-Post & Direct API prêts' : 'Clique pour lier ton profil'}
              </p>
            </div>
            <ChevronRight
              size={14}
              className="text-gray-400 group-hover:text-[#00FFC6] group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
