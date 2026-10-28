import React, { useState } from 'react';
import {
  Flame,
  Music,
  Hash,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  Copy,
  Check,
  Sparkles,
  Zap,
  Filter,
  Volume2,
} from 'lucide-react';
import { NicheData, TrendingSound, TrendingHashtag, ViralFormat } from '../types/tiktok';

interface RadarViralViewProps {
  niche: NicheData;
  onSelectForFactory: (item: {
    sound?: TrendingSound;
    format?: ViralFormat;
    hashtag?: TrendingHashtag;
  }) => void;
}

export const RadarViralView: React.FC<RadarViralViewProps> = ({
  niche,
  onSelectForFactory,
}) => {
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'sounds' | 'hashtags' | 'formats'>('all');

  const togglePlaySound = (id: string) => {
    if (playingSoundId === id) {
      setPlayingSoundId(null);
    } else {
      setPlayingSoundId(id);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTag(id);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const copyAllHashtags = () => {
    const allTags = niche.hashtags.map((h) => h.tag).join(' ');
    navigator.clipboard.writeText(allTags);
    setCopiedTag('all');
    setTimeout(() => setCopiedTag(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#12121A]/90 border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF2E93] to-[#7C3AED] flex items-center justify-center text-white shadow-lg shadow-[#FF2E93]/20">
            <Flame size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">
                Radar Viral TikTok (HOT) : {niche.name} {niche.emoji}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#FF2E93]/20 text-[#FF2E93] text-[10px] font-bold border border-[#FF2E93]/40">
                Temps Réel
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Analyse prédictive de l’algorithme TikTok : sons émergents, formats viraux et hashtags à faible concurrence.
            </p>
          </div>
        </div>

        {/* Action button: Copy all hashtags */}
        <div className="flex items-center gap-3">
          <button
            onClick={copyAllHashtags}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 transition-all"
          >
            {copiedTag === 'all' ? (
              <>
                <Check size={14} className="text-[#00FFC6]" />
                <span className="text-[#00FFC6]">Hashtags Copiés !</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copier tous les hashtags</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            activeFilter === 'all'
              ? 'bg-[#00FFC6] text-black font-bold'
              : 'text-gray-400 hover:text-white bg-white/[0.02]'
          }`}
        >
          Vue Intégrale (Son + Hashtag + Format)
        </button>
        <button
          onClick={() => setActiveFilter('sounds')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            activeFilter === 'sounds'
              ? 'bg-[#FF2E93] text-white font-bold'
              : 'text-gray-400 hover:text-white bg-white/[0.02]'
          }`}
        >
          Sons Tendances ({niche.sounds.length})
        </button>
        <button
          onClick={() => setActiveFilter('hashtags')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            activeFilter === 'hashtags'
              ? 'bg-[#7C3AED] text-white font-bold'
              : 'text-gray-400 hover:text-white bg-white/[0.02]'
          }`}
        >
          Hashtags ({niche.hashtags.length})
        </button>
        <button
          onClick={() => setActiveFilter('formats')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            activeFilter === 'formats'
              ? 'bg-cyan-500 text-black font-bold'
              : 'text-gray-400 hover:text-white bg-white/[0.02]'
          }`}
        >
          Formats Vidéos ({niche.formats.length})
        </button>
      </div>

      {/* Main Radar Viral Matrix Table (Filtered by Niche) */}
      <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Matrice Virale Algorithmique : Niche {niche.name}</h3>
            <p className="text-xs text-gray-400">
              Combinaisons gagnantes détectées par l'IA pour percer sur la For You Page
            </p>
          </div>
          <span className="text-xs text-[#00FFC6] font-bold font-mono">
            {niche.sounds.length} sons • {niche.hashtags.length} hashtags analysés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="pb-3 pr-4">Son Tendance & Audio</th>
                <th className="pb-3 pr-4">Hashtag Associé</th>
                <th className="pb-3 pr-4">Format Gagnant</th>
                <th className="pb-3 pr-4">Score Viral</th>
                <th className="pb-3 pr-4">Croissance 24h</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {niche.sounds.map((sound, idx) => {
                const hashtag = niche.hashtags[idx % niche.hashtags.length];
                const format = niche.formats[idx % niche.formats.length];
                const isPlaying = playingSoundId === sound.id;

                return (
                  <tr key={sound.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Son Column with Audio Wave Preview */}
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => togglePlaySound(sound.id)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            isPlaying
                              ? 'bg-[#00FFC6] text-black shadow-lg shadow-[#00FFC6]/30'
                              : 'bg-white/5 hover:bg-white/10 text-white'
                          }`}
                        >
                          {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-[#00FFC6] transition-colors">
                              {sound.title}
                            </span>
                            {sound.isHot && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF2E93]/20 text-[#FF2E93] border border-[#FF2E93]/30">
                                HOT
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                            <span>{sound.artist}</span>
                            <span>•</span>
                            <span>{sound.bpm} BPM</span>
                            <span>•</span>
                            <span className="text-gray-300 font-mono">{sound.usageCount} vidéos</span>
                          </div>

                          {/* Sound wave simulation */}
                          {isPlaying && (
                            <div className="flex items-center gap-1 mt-1.5 h-3">
                              <span className="w-1 bg-[#00FFC6] rounded-full wave-bar-1"></span>
                              <span className="w-1 bg-[#00FFC6] rounded-full wave-bar-2"></span>
                              <span className="w-1 bg-[#00FFC6] rounded-full wave-bar-3"></span>
                              <span className="w-1 bg-[#00FFC6] rounded-full wave-bar-4"></span>
                              <span className="w-1 bg-[#00FFC6] rounded-full wave-bar-5"></span>
                              <span className="text-[9px] text-[#00FFC6] font-mono ml-1 font-bold">
                                Lecture extrait 15s...
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Hashtag Column */}
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#00FFC6]">{hashtag?.tag}</span>
                        <button
                          onClick={() => copyToClipboard(hashtag?.tag || '', hashtag?.id || '')}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity"
                        >
                          {copiedTag === hashtag?.id ? (
                            <Check size={12} className="text-[#00FFC6]" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {hashtag?.views} vues • Concurrence : {hashtag?.competition}
                      </p>
                    </td>

                    {/* Format Column */}
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{format?.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">
                          {format?.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                        Watch time : <strong className="text-gray-200">{format?.avgWatchTime}</strong> • Boost : {format?.viralMultiplier}
                      </p>
                    </td>

                    {/* Score Viral (0-100) Column */}
                    <td className="py-4 pr-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span
                            className={
                              sound.viralScore >= 95
                                ? 'text-[#00FFC6]'
                                : sound.viralScore >= 90
                                ? 'text-[#FF2E93]'
                                : 'text-purple-400'
                            }
                          >
                            {sound.viralScore}/100
                          </span>
                        </div>
                        <div className="w-24 bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${sound.viralScore}%` }}
                            className={`h-full rounded-full ${
                              sound.viralScore >= 95
                                ? 'bg-[#00FFC6]'
                                : sound.viralScore >= 90
                                ? 'bg-[#FF2E93]'
                                : 'bg-purple-500'
                            }`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Croissance Column */}
                    <td className="py-4 pr-4">
                      <span className="inline-flex items-center gap-1 font-bold font-mono text-[#00FFC6] bg-[#00FFC6]/10 px-2 py-0.5 rounded-md text-xs">
                        <TrendingUp size={12} />
                        {sound.growth}
                      </span>
                    </td>

                    {/* Action Column: Transfer to Content Factory */}
                    <td className="py-4 text-right">
                      <button
                        onClick={() =>
                          onSelectForFactory({
                            sound: sound,
                            format: format,
                            hashtag: hashtag,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00FFC6]/20 to-[#7C3AED]/20 hover:from-[#00FFC6]/30 hover:to-[#7C3AED]/30 border border-[#00FFC6]/30 text-white text-xs font-bold transition-all shadow-sm group-hover:border-[#00FFC6]"
                      >
                        <Sparkles size={12} className="text-[#00FFC6]" />
                        <span>Créer Vidéo</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Video Templates & Hook Quick Bank */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Templates of this Niche */}
        <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Templates Recommandés pour {niche.name}</span>
            </h3>
            <span className="text-[10px] text-gray-400 font-semibold uppercase">
              {niche.templates.length} modèles
            </span>
          </div>

          <div className="space-y-3">
            {niche.templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-3.5 rounded-xl bg-[#1A1A27] border border-white/5 hover:border-[#00FFC6]/30 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{tpl.title}</h4>
                  <span className="text-[10px] font-bold text-[#00FFC6] bg-[#00FFC6]/10 px-2 py-0.5 rounded">
                    Rétention {tpl.avgRetention}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  <strong className="text-gray-300">Structure :</strong> {tpl.structure}
                </p>
                <div className="p-2 rounded-lg bg-[#08080D] text-[11px] text-[#00FFC6] italic">
                  "{tpl.exampleHook}"
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Viral Hooks Bank */}
        <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">
              Banque de Hooks Psychologiques ({niche.name})
            </h3>
            <span className="text-[10px] text-[#00FFC6] font-bold">Rétention 0-3s</span>
          </div>

          <div className="space-y-2.5">
            {niche.hooks.map((hk) => {
              const isCopied = copiedTag === hk.id;
              return (
                <div
                  key={hk.id}
                  className="p-3 rounded-xl bg-[#1A1A27] border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-white/10 text-gray-300">
                        {hk.category}
                      </span>
                      <span className="text-[10px] text-[#00FFC6] font-mono font-bold">
                        {hk.retentionRate}% rétention
                      </span>
                    </div>
                    <p className="text-xs text-white font-medium">"{hk.text}"</p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(hk.text, hk.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all flex-shrink-0"
                  >
                    {isCopied ? <Check size={14} className="text-[#00FFC6]" /> : <Copy size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
