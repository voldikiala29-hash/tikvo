import React, { useState } from 'react';
import {
  Eye,
  Users,
  Flame,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Play,
  Share2,
  Bookmark,
  CheckCircle2,
  Clock,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { NicheData, ScheduledPost } from '../types/tiktok';

interface DashboardViewProps {
  niche: NicheData;
  onNavigate: (view: string) => void;
  onGenerate10Ideas: () => void;
  scheduledPosts: ScheduledPost[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  niche,
  onNavigate,
  onGenerate10Ideas,
  scheduledPosts,
}) => {
  const [timeframe, setTimeframe] = useState<'7j' | '30j' | '90j'>('30j');

  // Chart data simulation depending on timeframe
  const chartPoints = timeframe === '7j' 
    ? [25, 42, 60, 55, 80, 95, 110]
    : timeframe === '30j'
    ? [15, 22, 35, 48, 42, 58, 65, 78, 92, 85, 105, 120]
    : [10, 18, 30, 45, 62, 75, 90, 110, 130, 160, 195, 230];

  const recentPosts = [
    {
      id: 'rp-1',
      title: niche.templates[0]?.title || 'Look chic avec un petit budget',
      views: '412.5K',
      retention: '84.2%',
      shares: '14.8K',
      shopSales: '1 240 €',
      duration: '18s',
      gradient: 'from-pink-600 via-purple-600 to-indigo-800',
      postedAgo: 'Il y a 6h',
      status: 'Viral Surge (+340%)',
    },
    {
      id: 'rp-2',
      title: niche.templates[1]?.title || 'Erreur fatale que tout le monde fait',
      views: '189.2K',
      retention: '79.0%',
      shares: '6.2K',
      shopSales: '580 €',
      duration: '22s',
      gradient: 'from-cyan-600 via-teal-700 to-blue-900',
      postedAgo: 'Hier à 18:30',
      status: 'Stable',
    },
    {
      id: 'rp-3',
      title: niche.templates[2]?.title || 'La méthode secrète pour décupler tes résultats',
      views: '94.1K',
      retention: '82.5%',
      shares: '3.1K',
      shopSales: '310 €',
      duration: '25s',
      gradient: 'from-violet-600 via-purple-800 to-black',
      postedAgo: 'Il y a 2 jours',
      status: 'Recommandé FYP',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Niche Context */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#12121A] via-[#1A1A27] to-[#12121A] border border-white/5 p-6 backdrop-blur-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#00FFC6]/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00FFC6] via-[#7C3AED] to-[#FF2E93] p-[2px] shadow-lg shadow-[#00FFC6]/20 flex-shrink-0">
              <div className="w-full h-full bg-[#08080D] rounded-[14px] flex items-center justify-center text-3xl">
                {niche.emoji}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Dashboard Viral : {niche.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#00FFC6]/15 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC6] animate-ping"></span>
                  Algorithme FYP Actif
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-xl">
                {niche.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={onGenerate10Ideas}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1A27] hover:bg-[#232338] border border-[#00FFC6]/40 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Sparkles size={14} className="text-[#00FFC6]" />
              <span>Idées Virales ({niche.name})</span>
            </button>
            <button
              onClick={() => onNavigate('factory')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black font-extrabold text-xs transition-all hover:opacity-95 shadow-lg shadow-[#00FFC6]/25"
            >
              <Sparkles size={14} />
              <span>Nouveau Script</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Vues Totales */}
        <div className="p-5 rounded-2xl bg-[#12121A]/80 border border-white/5 hover:border-[#00FFC6]/40 transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400">Vues Totales FYP</span>
            <div className="w-8 h-8 rounded-xl bg-[#00FFC6]/10 text-[#00FFC6] flex items-center justify-center">
              <Eye size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{niche.kpis.totalViews}</span>
            <span className="text-xs font-bold text-[#00FFC6] flex items-center">
              <ArrowUpRight size={14} />
              {niche.kpis.viewsGrowth}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">Vs. 30 derniers jours</p>
          <div className="w-full bg-white/5 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#00FFC6] h-full rounded-full w-[78%]"></div>
          </div>
        </div>

        {/* KPI 2 : Abonnés */}
        <div className="p-5 rounded-2xl bg-[#12121A]/80 border border-white/5 hover:border-[#7C3AED]/40 transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400">Abonnés Qualifiés</span>
            <div className="w-8 h-8 rounded-xl bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{niche.kpis.followers}</span>
            <span className="text-xs font-bold text-[#7C3AED] flex items-center">
              <ArrowUpRight size={14} />
              {niche.kpis.followersGrowth}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">Conversion FYP en Follows</p>
          <div className="w-full bg-white/5 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#7C3AED] h-full rounded-full w-[65%]"></div>
          </div>
        </div>

        {/* KPI 3 : Taux Viralité */}
        <div className="p-5 rounded-2xl bg-[#12121A]/80 border border-white/5 hover:border-[#FF2E93]/40 transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400">Taux de Viralité (Rétention &gt; 75%)</span>
            <div className="w-8 h-8 rounded-xl bg-[#FF2E93]/15 text-[#FF2E93] flex items-center justify-center">
              <Flame size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{niche.kpis.viralityRate}</span>
            <span className="text-xs font-bold text-[#FF2E93] flex items-center">
              <ArrowUpRight size={14} />
              {niche.kpis.viralityGrowth}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">Moyenne secteur : 4.2%</p>
          <div className="w-full bg-white/5 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#FF2E93] h-full rounded-full w-[88%]"></div>
          </div>
        </div>

        {/* KPI 4 : Revenus Estimés */}
        <div className="p-5 rounded-2xl bg-[#12121A]/80 border border-white/5 hover:border-[#00FFC6]/40 transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400">Revenus Estimés (Shop + RPM)</span>
            <div className="w-8 h-8 rounded-xl bg-[#00FFC6]/15 text-[#00FFC6] flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#00FFC6]">{niche.kpis.estimatedRevenue}</span>
            <span className="text-xs font-bold text-[#00FFC6] flex items-center">
              <ArrowUpRight size={14} />
              {niche.kpis.revenueGrowth}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">Commissions & Creator Rewards</p>
          <div className="w-full bg-white/5 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-gradient-to-r from-[#00FFC6] to-[#7C3AED] h-full rounded-full w-[82%]"></div>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Flash Viral Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Performance Chart & Prochain créneau */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Dynamique de Croissance FYP</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                    Niche {niche.name}
                  </span>
                </h3>
                <p className="text-xs text-gray-400">Évolution du volume de vues et des impulsions algorithmiques</p>
              </div>

              {/* Timeframe pill selector */}
              <div className="flex rounded-xl bg-[#08080D] p-1 border border-white/5 text-xs font-semibold">
                {(['7j', '30j', '90j'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      timeframe === t ? 'bg-[#00FFC6] text-black font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Clean SVG Line Chart */}
            <div className="h-48 w-full flex items-end gap-2 pt-6 pb-2 px-1">
              {chartPoints.map((val, idx) => {
                const max = Math.max(...chartPoints);
                const heightPercent = (val / max) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[10px] text-[#00FFC6] opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                      {val}K
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-[#7C3AED]/30 via-[#00FFC6]/50 to-[#00FFC6] group-hover:to-[#FF2E93] transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-1 bg-white/50"></div>
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono">
                      J{idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00FFC6]"></span>
                  <span className="text-gray-300">Vues Algorithmiques</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]"></span>
                  <span className="text-gray-300">Taux de Complétion</span>
                </div>
              </div>
              <span className="text-[#00FFC6] font-bold">
                🎯 Heures de pointe : {niche.targetAudience.peakHours.join(' • ')}
              </span>
            </div>
          </div>

          {/* Scheduled Posts Queue Preview */}
          <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#00FFC6]" />
                <h3 className="text-base font-bold text-white">File d'Attente Automatisée (Auto-Post)</h3>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs text-[#00FFC6] hover:underline font-bold"
              >
                Voir calendrier complet
              </button>
            </div>

            {scheduledPosts.length === 0 ? (
              <div className="text-center py-8 rounded-xl bg-[#08080D]/60 border border-white/5">
                <Clock size={24} className="text-gray-500 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Aucun post planifié pour aujourd'hui.</p>
                <button
                  onClick={() => onNavigate('factory')}
                  className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                >
                  Générer et programmer une vidéo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledPosts.slice(0, 3).map((post) => (
                  <div
                    key={post.id}
                    className="p-3.5 rounded-xl bg-[#1A1A27] border border-white/5 flex items-center justify-between gap-4 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#FF2E93] to-[#7C3AED] flex items-center justify-center text-xs font-black text-white">
                        {post.duration}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white truncate max-w-xs">{post.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                          <span>{post.accountHandle}</span>
                          <span>•</span>
                          <span className="text-[#00FFC6]">{post.scheduledTime}</span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-[#00FFC6]/10 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/20">
                      Prêt pour Direct Post API
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Radar Viral Flash Alert & Top Products */}
        <div className="space-y-6">
          {/* Flash Viral Alert */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#1A1A27] to-[#12121A] border border-[#FF2E93]/30 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded-full bg-[#FF2E93]/20 text-[#FF2E93] text-[10px] font-bold border border-[#FF2E93]/40 flex items-center gap-1">
                <Flame size={12} className="animate-bounce" />
                FLASH VIRAL DÉTECTÉ
              </span>
              <span className="text-[10px] text-gray-400 font-mono">24h Radar</span>
            </div>

            <h4 className="text-base font-black text-white mb-1">
              {niche.sounds[0]?.title || 'Son Tendance #1'}
            </h4>
            <p className="text-xs text-gray-400 mb-4">
              Artiste : {niche.sounds[0]?.artist || 'Audio Lab'} • Croissance :{' '}
              <strong className="text-[#00FFC6]">{niche.sounds[0]?.growth || '+310%'}</strong>
            </p>

            <div className="p-3 rounded-xl bg-[#08080D]/80 border border-white/5 space-y-2 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Score Viral :</span>
                <span className="text-[#00FFC6] font-bold">{niche.sounds[0]?.viralScore || 98}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Format Recommandé :</span>
                <span className="text-white font-medium">{niche.formats[0]?.name || 'Transition Rapide'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hashtag Clé :</span>
                <span className="text-[#FF2E93] font-bold">{niche.hashtags[0]?.tag || '#FYP'}</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('radar')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF2E93] to-[#7C3AED] hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#FF2E93]/20"
            >
              <span>Ouvrir le Radar Viral ({niche.name})</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Top TikTok Shop Product for this Niche */}
          <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-[#00FFC6]" />
                <h4 className="text-sm font-bold text-white">Produit Gagnant TikTok Shop</h4>
              </div>
              <span className="text-[10px] font-bold text-[#00FFC6] bg-[#00FFC6]/10 px-2 py-0.5 rounded-md">
                +{niche.products[0]?.commissionRate || 20}% com.
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1A1A27] border border-white/5 space-y-2">
              <p className="text-xs font-bold text-white">{niche.products[0]?.name}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Prix : <strong className="text-white">{niche.products[0]?.price}</strong></span>
                <span className="text-[#00FFC6] font-bold">Gain : {niche.products[0]?.commission} / vente</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                <span>Ventes 24h : {niche.products[0]?.sales24h} unités</span>
                <span className="text-amber-400">★ {niche.products[0]?.rating}</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('monetization')}
              className="mt-4 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-all text-center block"
            >
              Voir tous les produits monétisés
            </button>
          </div>
        </div>
      </div>

      {/* Recent Viral Videos Table */}
      <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Performances des Dernières Publications</h3>
            <p className="text-xs text-gray-400">Métriques de rétention, partage et revenus générés par vidéo</p>
          </div>
          <button
            onClick={() => onNavigate('accounts')}
            className="text-xs text-[#00FFC6] hover:underline font-bold"
          >
            Gérer les comptes
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="pb-3">Vidéo / Template</th>
                <th className="pb-3">Vues FYP</th>
                <th className="pb-3">Rétention Moyenne</th>
                <th className="pb-3">Partages & Reposts</th>
                <th className="pb-3">Revenus TikTok Shop</th>
                <th className="pb-3">Statut Algo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {recentPosts.map((post) => (
                <tr key={post.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-12 rounded-lg bg-gradient-to-br ${post.gradient} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                        <Play size={12} fill="white" />
                      </div>
                      <div>
                        <p className="font-bold text-white line-clamp-1">{post.title}</p>
                        <p className="text-[10px] text-gray-500">{post.postedAgo} • {post.duration}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 font-mono font-bold text-white">{post.views}</td>
                  <td className="py-3">
                    <span className="font-semibold text-[#00FFC6]">{post.retention}</span>
                  </td>
                  <td className="py-3 font-mono">{post.shares}</td>
                  <td className="py-3 font-bold text-[#00FFC6]">{post.shopSales}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#00FFC6]/15 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/30">
                      {post.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
