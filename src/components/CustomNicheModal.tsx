import React, { useState } from 'react';
import { X, Plus, Sparkles, Check } from 'lucide-react';
import { NicheData } from '../types/tiktok';

interface CustomNicheModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomNiche: (newNiche: NicheData) => void;
}

export const CustomNicheModal: React.FC<CustomNicheModalProps> = ({
  isOpen,
  onClose,
  onAddCustomNiche,
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🔥');
  const [tagline, setTagline] = useState('');
  const [targetAudience, setTargetAudience] = useState('18 - 35 ans');
  const [firstTemplateTitle, setFirstTemplateTitle] = useState('');
  const [firstHook, setFirstHook] = useState('');
  const [firstHashtag, setFirstHashtag] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const nicheId = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();

    const newNiche: NicheData = {
      id: nicheId,
      name: name.trim(),
      emoji: emoji || '🚀',
      tagline: tagline.trim() || `Contenus viraux et monétisation pour la niche ${name}`,
      description: `Niche personnalisée créée pour dominer l'algorithme TikTok dans ${name}.`,
      kpis: {
        totalViews: '1.2M',
        viewsGrowth: '+45.0%',
        followers: '32.4K',
        followersGrowth: '+18.2%',
        viralityRate: '9.4%',
        viralityGrowth: '+2.1%',
        estimatedRevenue: '1 250 €',
        revenueGrowth: '+30.0%',
      },
      templates: [
        {
          id: `${nicheId}-tpl-1`,
          title: firstTemplateTitle.trim() || `3 Erreurs fatales dans ${name}`,
          structure: 'Hook choc (0-2s) -> Problème n°1 (2-6s) -> Problème n°2 (6-11s) -> La solution inédite (11-18s) -> Partage en bio',
          avgRetention: '86%',
          bestDuration: '20s',
          exampleHook: firstHook.trim() || `Si tu fais encore ça dans ${name}, arrête immédiatement.`,
          description: `Template optimisé pour l'engagement et les commentaires dans ${name}.`,
          recommendedSoundType: 'Beat énergique tendance',
        },
      ],
      hooks: [
        {
          id: `${nicheId}-hook-1`,
          category: 'choc',
          text: firstHook.trim() || `Le secret de ${name} que 99% des gens ignorent totalement.`,
          retentionRate: 91,
          difficulty: 'Facile',
        },
        {
          id: `${nicheId}-hook-2`,
          category: 'curiosite',
          text: `Pourquoi personne ne t'explique cette vérité sur ${name} ?`,
          retentionRate: 88,
          difficulty: 'Facile',
        },
      ],
      sounds: [
        {
          id: `${nicheId}-snd-1`,
          title: `Viral Pulse for ${name}`,
          artist: 'Tikokvoldi Sounds',
          usageCount: '142.0K',
          growth: '+210%',
          isHot: true,
          bpm: 120,
          genre: 'Cyber Electronic',
          viralScore: 95,
        },
      ],
      hashtags: [
        {
          id: `${nicheId}-tag-1`,
          tag: firstHashtag.trim().startsWith('#') ? firstHashtag.trim() : `#${firstHashtag.trim() || name.replace(/\s+/g, '') + 'Tok'}`,
          views: '1.4B',
          growth: '+85%',
          competition: 'Moyenne',
          trendScore: 94,
        },
      ],
      formats: [
        {
          id: `${nicheId}-fmt-1`,
          name: 'Face Cam Dynamique + Textes Clés',
          badge: 'Rétention Forte',
          description: 'Présentation rythmée avec zoom toutes les 2.5 secondes.',
          avgWatchTime: '90%',
          viralMultiplier: '3.0x',
        },
      ],
      products: [
        {
          id: `${nicheId}-prd-1`,
          name: `Kit Ultime Démarrage ${name}`,
          price: '29,90 €',
          commission: '7,50 €',
          commissionRate: 25,
          sales24h: 310,
          category: 'Produit Niche',
          sampleAvailable: true,
          rating: 4.9,
        },
      ],
      affiliates: [
        {
          id: `${nicheId}-aff-1`,
          brand: `Programme Partenaire ${name}`,
          offer: '15% de commission par conversion',
          payout: '15% net',
          conversionRate: '4.2%',
          status: 'Top Performer',
          link: 'https://creators.tiktok.com/custom',
        },
      ],
      accounts: [
        {
          id: `${nicheId}-acc-1`,
          handle: `@voldi_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          displayName: `${name} Master Studio`,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          nicheId: nicheId,
          followers: 32400,
          totalLikes: '840K',
          avgViews: '45K',
          engagementRate: '9.4%',
          apiConnected: true,
          autoPostEnabled: true,
          shadowbanRisk: 'Aucun',
          creatorRewardsEligible: true,
        },
      ],
      targetAudience: {
        ageRange: targetAudience || '18 - 35 ans',
        genderRatio: '50% Hommes / 50% Femmes',
        peakHours: ['12:30', '18:30', '21:00'],
        topGeo: ['France', 'Belgique', 'Suisse'],
      },
    };

    onAddCustomNiche(newNiche);
    onClose();
  };

  const sampleEmojis = ['🚀', '🧠', '🐶', '✈️', '💎', '🎨', '🏎️', '🌱', '⚽', '📈'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#12121A] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1A1A27]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00FFC6] to-[#7C3AED] flex items-center justify-center text-xl">
              {emoji}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Ajouter une Niche Personnalisée</h2>
              <p className="text-xs text-gray-400">
                Crée une nouvelle niche pour adapter tous les outils, sons et scripts.
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-bold text-gray-300 block mb-1.5">Émoji</label>
              <div className="relative">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  maxLength={2}
                  className="w-full text-center py-2.5 rounded-xl bg-[#08080D] border border-white/10 text-xl text-white focus:outline-none focus:border-[#00FFC6]"
                />
              </div>
            </div>

            <div className="col-span-3">
              <label className="text-xs font-bold text-gray-300 block mb-1.5">Nom de la Niche *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Crypto & Web3, Animaux, Voyage..."
                className="w-full px-3 py-2.5 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFC6]"
              />
            </div>
          </div>

          {/* Quick emoji picks */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-gray-400 mr-1">Suggestions :</span>
            {sampleEmojis.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                  emoji === e ? 'bg-[#00FFC6]/20 border border-[#00FFC6]' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1.5">
              Accroche / Thématique (Tagline)
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Ex: Astuces Bitcoin, actualités Web3 et sécurité crypto"
              className="w-full px-3 py-2.5 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFC6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5">Hashtag Principal</label>
              <input
                type="text"
                value={firstHashtag}
                onChange={(e) => setFirstHashtag(e.target.value)}
                placeholder="Ex: #CryptoFrance"
                className="w-full px-3 py-2.5 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFC6]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5">Cible Démographique</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Ex: 20 - 35 ans"
                className="w-full px-3 py-2.5 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFC6]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1.5">
              Exemple de Hook Viral (0-3 secondes)
            </label>
            <input
              type="text"
              value={firstHook}
              onChange={(e) => setFirstHook(e.target.value)}
              placeholder="Ex: Ne touche plus à ton portefeuille avant d'avoir vu ça."
              className="w-full px-3 py-2.5 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFC6]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FFC6] via-[#7C3AED] to-[#FF2E93] text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-[#00FFC6]/10"
            >
              <Plus size={16} />
              <span>Créer la Niche et Activer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
