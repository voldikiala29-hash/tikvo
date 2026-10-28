import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Flame,
  Sparkles,
} from 'lucide-react';
import { ScheduledPost, NicheData } from '../types/tiktok';

interface CalendarViewProps {
  niche: NicheData;
  scheduledPosts: ScheduledPost[];
  onAddPost: (post: ScheduledPost) => void;
  onNavigateToFactory: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  niche,
  scheduledPosts,
  onAddPost,
  onNavigateToFactory,
}) => {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const peakHours = niche.targetAudience.peakHours;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white">Calendrier & Programmateur TikTok</h1>
            <span className="px-2 py-0.5 rounded-full bg-[#00FFC6]/20 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/30">
              Auto-Post Multi-Comptes
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Créneaux dorés détectés par l'algorithme pour {niche.name} : {peakHours.join(' • ')}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
            <Flame size={14} className="animate-pulse" />
            <span>Streak Algo : 14 jours (Bonus +35% FYP)</span>
          </div>

          <button
            onClick={onNavigateToFactory}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black font-extrabold text-xs transition-all hover:opacity-95 shadow-md shadow-[#00FFC6]/20"
          >
            <Plus size={15} />
            <span>Créer un Post</span>
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day, idx) => {
          const isToday = idx === 1; // e.g. Tuesday
          const postsForDay = scheduledPosts.filter(
            (p) => idx % 2 === 0 || p.nicheId === niche.id
          );

          return (
            <div
              key={day}
              className={`p-4 rounded-2xl bg-[#12121A]/90 border transition-all flex flex-col justify-between min-h-[360px] ${
                isToday ? 'border-[#00FFC6]/50 shadow-lg shadow-[#00FFC6]/5' : 'border-white/5'
              }`}
            >
              <div>
                {/* Day Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                  <span className={`text-xs font-bold ${isToday ? 'text-[#00FFC6]' : 'text-white'}`}>
                    {day}
                  </span>
                  {isToday ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#00FFC6] text-black">
                      Aujourd'hui
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500 font-mono">2{idx + 7} Oct</span>
                  )}
                </div>

                {/* Golden Hour algorithmic indicator for this niche */}
                <div className="mb-3 p-1.5 rounded-lg bg-[#1A1A27] border border-white/5 text-[9px] text-center text-gray-400">
                  ⚡ Créneau pic : <strong className="text-[#00FFC6]">{peakHours[idx % peakHours.length]}</strong>
                </div>

                {/* Posts scheduled in this day */}
                <div className="space-y-2">
                  {idx === 1 ? (
                    // Sample post for today
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#1A1A27] to-[#12121A] border border-[#00FFC6]/30 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="font-bold text-[#00FFC6] flex items-center gap-1">
                          <Clock size={10} /> {peakHours[0]}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-[#00FFC6]/20 text-[#00FFC6] font-bold">
                          Prêt
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-white line-clamp-1">
                        {niche.templates[0]?.title}
                      </p>
                      <p className="text-[9px] text-gray-400 line-clamp-1">
                        {niche.accounts[0]?.handle || '@voldi_pro'}
                      </p>
                    </div>
                  ) : idx === 3 ? (
                    <div className="p-2.5 rounded-xl bg-[#1A1A27] border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="font-bold text-purple-400 flex items-center gap-1">
                          <Clock size={10} /> 20:30
                        </span>
                        <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                          Brouillon
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-white line-clamp-1">
                        {niche.templates[1]?.title || 'Erreur fatale'}
                      </p>
                    </div>
                  ) : idx === 5 ? (
                    <div className="p-2.5 rounded-xl bg-[#1A1A27] border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="font-bold text-[#FF2E93] flex items-center gap-1">
                          <Clock size={10} /> 12:45
                        </span>
                        <span className="px-1 py-0.2 rounded bg-[#FF2E93]/20 text-[#FF2E93] font-bold">
                          Shop Lié
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-white line-clamp-1">
                        {niche.products[0]?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-[10px]">
                      Aucun post planifié
                    </div>
                  )}
                </div>
              </div>

              {/* Add post shortcut button */}
              <button
                onClick={onNavigateToFactory}
                className="w-full mt-3 py-1.5 rounded-lg border border-dashed border-white/10 hover:border-[#00FFC6]/40 text-gray-400 hover:text-[#00FFC6] text-[10px] font-semibold flex items-center justify-center gap-1 transition-all"
              >
                <Plus size={11} />
                <span>Programmer</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
