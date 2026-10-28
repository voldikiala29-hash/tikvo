import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Flame,
  ArrowRight,
  TrendingUp,
  Clock,
  Music,
  DollarSign,
  Download,
} from 'lucide-react';
import { ViralIdea, NicheData } from '../types/tiktok';

interface ViralIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  niche: NicheData;
  ideas: ViralIdea[];
  onSelectIdeaForFactory: (idea: ViralIdea) => void;
}

export const ViralIdeasModal: React.FC<ViralIdeasModalProps> = ({
  isOpen,
  onClose,
  niche,
  ideas,
  onSelectIdeaForFactory,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>('all');

  if (!isOpen) return null;

  const handleCopyHook = (id: string, hookText: string) => {
    navigator.clipboard.writeText(hookText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAll = () => {
    const textContent = ideas
      .map(
        (idea, idx) =>
          `IDÉE #${idx + 1} : ${idea.title}\n` +
          `Score Viral : ${idea.viralScore}/100\n` +
          `Hook (0-3s) : "${idea.hook}"\n` +
          `Concept : ${idea.concept}\n` +
          `Format : ${idea.format} | Durée : ${idea.idealDuration}\n` +
          `Son : ${idea.soundType}\n` +
          `Monétisation : ${idea.monetizationAngle}\n` +
          `--------------------------------------------------\n`
      )
      .join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tikokvoldi-10-idees-${niche.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#12121A] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#1A1A27] to-[#12121A]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00FFC6] via-[#7C3AED] to-[#FF2E93] p-[2px]">
              <div className="w-full h-full bg-[#08080D] rounded-[14px] flex items-center justify-center text-2xl">
                {niche.emoji}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  10 Idées Ultra-Virales : Niche {niche.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#00FFC6]/20 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/30">
                  Algorithme 2026 Ready
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Idées calibrées pour maximiser le taux de rétention, les sauvegardes et la conversion monétisée.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all"
            >
              <Download size={14} />
              <span>Exporter TXT</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideas.map((idea, index) => {
              const isCopied = copiedId === idea.id;
              return (
                <div
                  key={idea.id}
                  className="p-5 rounded-2xl bg-[#1A1A27]/70 border border-white/5 hover:border-[#00FFC6]/40 transition-all flex flex-col justify-between group hover:shadow-xl hover:shadow-[#00FFC6]/5"
                >
                  <div>
                    {/* Top pill row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-gray-300">
                        #{index + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#00FFC6]/15 text-[#00FFC6] border border-[#00FFC6]/30">
                          <Flame size={12} />
                          {idea.viralScore}/100
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#00FFC6] transition-colors">
                      {idea.title}
                    </h3>

                    {/* Hook Box */}
                    <div className="p-3 rounded-xl bg-[#08080D]/80 border border-white/5 mb-3 relative group/hook">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                        <span>Hook Psychologique (0-3s)</span>
                        <button
                          onClick={() => handleCopyHook(idea.id, idea.hook)}
                          className="flex items-center gap-1 text-[#00FFC6] hover:underline"
                        >
                          {isCopied ? (
                            <>
                              <Check size={11} />
                              <span>Copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Copier</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-[#00FFC6] font-medium italic">
                        "{idea.hook}"
                      </p>
                    </div>

                    {/* Concept */}
                    <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                      <strong className="text-gray-100">Angle :</strong> {idea.concept}
                    </p>

                    {/* Tags */}
                    <div className="space-y-1.5 text-[11px] text-gray-400 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-[#7C3AED]" />
                        <span>Format & Durée : {idea.format} ({idea.idealDuration})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Music size={12} className="text-[#FF2E93]" />
                        <span className="truncate">Son : {idea.soundType}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={12} className="text-[#00FFC6]" />
                        <span className="text-gray-300 font-medium truncate">
                          Monétisation : {idea.monetizationAngle}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => onSelectIdeaForFactory(idea)}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00FFC6]/20 via-[#7C3AED]/20 to-[#FF2E93]/20 hover:from-[#00FFC6]/30 hover:via-[#7C3AED]/30 hover:to-[#FF2E93]/30 border border-[#00FFC6]/30 hover:border-[#00FFC6]/60 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Sparkles size={14} className="text-[#00FFC6]" />
                    <span>Créer le script dans Content Factory</span>
                    <ArrowRight size={14} />
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
