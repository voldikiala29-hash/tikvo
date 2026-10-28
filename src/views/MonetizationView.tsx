import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Award,
  Link,
  Calculator,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { NicheData } from '../types/tiktok';

interface MonetizationViewProps {
  niche: NicheData;
}

export const MonetizationView: React.FC<MonetizationViewProps> = ({ niche }) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'affiliate' | 'branddeals' | 'digital' | 'rewards'>('shop');

  // Rate card calculator state
  const [followerCount, setFollowerCount] = useState<number>(120000);
  const [avgViewsCount, setAvgViewsCount] = useState<number>(65000);

  // Creator Rewards calculator state
  const [estimatedMonthlyViews, setEstimatedMonthlyViews] = useState<number>(1500000);
  const [rpmRate, setRpmRate] = useState<number>(
    niche.id === 'business' ? 1.4 : niche.id === 'education' ? 1.2 : 0.9
  );

  // Rate card calculation formula
  const baseRate = Math.round((avgViewsCount / 1000) * 12 + (followerCount / 1000) * 4);
  const bundleRate = Math.round(baseRate * 2.4);

  // Rewards calculation formula
  const monthlyRewardsEst = Math.round((estimatedMonthlyViews / 1000) * rpmRate);

  const [requestedSampleId, setRequestedSampleId] = useState<string | null>(null);

  const handleRequestSample = (id: string) => {
    setRequestedSampleId(id);
    setTimeout(() => setRequestedSampleId(null), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white">Monétisation Hub : {niche.name}</h1>
            <span className="text-xl">{niche.emoji}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#00FFC6]/20 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/30">
              Revenus Optimisés
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            4 leviers de rentabilisation adaptés sur-mesure à la niche {niche.name} : TikTok Shop, Affiliation, Sponsoring et Infoproduits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#00FFC6]/10 border border-[#00FFC6]/30 text-right">
            <span className="text-[10px] text-gray-400 block font-semibold">Potentiel Mensuel Niche</span>
            <span className="text-sm font-black text-[#00FFC6]">{niche.kpis.estimatedRevenue} / mois</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'shop'
              ? 'bg-[#00FFC6] text-black font-bold'
              : 'text-gray-400 hover:text-white bg-white/[0.02]'
          }`}
        >
          <ShoppingBag size={14} />
          <span>TikTok Shop ({niche.products.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('affiliate')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'affiliate'
              ? 'bg-[#FF2E93] text-white font-bold'
              : 'text-gray-400 hover:text-white bg-white/[0.02]'
          }`}
        >
          <Link size={14} />
          <span>Affiliation & Partenaires ({niche.affiliates.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('branddeals')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'branddeals'
              ? 'bg-[#7C3AED] text-white font-bold'
              : 'text-gray-400 hover:text-white bg-white/[0.02]'
          }`}
        >
          <Award size={14} />
          <span>Simulateur Brand Deals</span>
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'rewards'
              ? 'bg-amber-400 text-black font-bold'
              : 'text-gray-400 hover:text-white bg-white/[0.02]'
          }`}
        >
          <TrendingUp size={14} />
          <span>Creator Rewards (RPM)</span>
        </button>
      </div>

      {/* Tab 1: TikTok Shop */}
      {activeTab === 'shop' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Produits Gagnants TikTok Shop Validés pour {niche.name}
            </h3>
            <span className="text-xs text-[#00FFC6] font-bold">
              Échantillons gratuits créateur disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {niche.products.map((p) => {
              const isRequested = requestedSampleId === p.id;
              return (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl bg-[#12121A]/90 border border-white/5 hover:border-[#00FFC6]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300">
                        {p.category}
                      </span>
                      <span className="text-xs font-bold text-amber-400">★ {p.rating}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-2">{p.name}</h4>

                    <div className="p-3 rounded-xl bg-[#08080D] border border-white/5 space-y-2 text-xs mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Prix de vente public :</span>
                        <span className="font-bold text-white">{p.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Commission créateur :</span>
                        <span className="font-bold text-[#00FFC6]">
                          {p.commission} ({p.commissionRate}%)
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                        <span>Ventes dernières 24h :</span>
                        <span className="text-white font-mono">{p.sales24h} commandes</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleRequestSample(p.id)}
                      className="w-full py-2.5 rounded-xl bg-[#1A1A27] hover:bg-[#222234] border border-[#00FFC6]/30 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Package size={14} className="text-[#00FFC6]" />
                      <span>
                        {isRequested ? 'Demande envoyée au vendeur !' : 'Demander un échantillon gratuit'}
                      </span>
                    </button>
                    <p className="text-[10px] text-gray-400 text-center">
                      Lien direct pour affichage dans le panier orange TikTok
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Affiliate Programs */}
      {activeTab === 'affiliate' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">
            Programmes d'Affiliation Recommandés pour {niche.name}
          </h3>

          <div className="space-y-3">
            {niche.affiliates.map((aff) => (
              <div
                key={aff.id}
                className="p-4 rounded-2xl bg-[#12121A]/90 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-white">{aff.brand}</h4>
                    <span className="px-2 py-0.2 rounded-full bg-[#FF2E93]/20 text-[#FF2E93] text-[10px] font-bold border border-[#FF2E93]/30">
                      {aff.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{aff.offer}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#00FFC6] block">{aff.payout}</span>
                    <span className="text-[10px] text-gray-400">Conv. moy. : {aff.conversionRate}</span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(aff.link)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
                  >
                    Copier le Lien Affilié
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Brand Deals Rate Card Calculator */}
      {activeTab === 'branddeals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator size={16} className="text-[#7C3AED]" />
              <span>Simulateur de Tarif Vidéo Sponsorisée (Rate Card)</span>
            </h3>
            <p className="text-xs text-gray-400">
              Calcule le prix juste à facturer aux marques pour un placement de produit dans {niche.name}.
            </p>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Nombre d'abonnés :</span>
                <span className="font-bold text-white">{followerCount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={10000}
                max={500000}
                step={5000}
                value={followerCount}
                onChange={(e) => setFollowerCount(Number(e.target.value))}
                className="w-full accent-[#7C3AED]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Vues moyennes par vidéo :</span>
                <span className="font-bold text-white">{avgViewsCount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={5000}
                max={250000}
                step={2500}
                value={avgViewsCount}
                onChange={(e) => setAvgViewsCount(Number(e.target.value))}
                className="w-full accent-[#7C3AED]"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#08080D] border border-white/5 text-[11px] text-gray-400">
              💡 Le taux d'engagement et la spécialisation de la niche {niche.name} permettent d'appliquer un multiplicateur premium auprès des annonceurs.
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1A1A27] to-[#12121A] border border-[#7C3AED]/40 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED]">
                Recommandation Tarifaire
              </span>
              <h4 className="text-2xl font-black text-white mt-1 mb-4">
                {baseRate} € <span className="text-xs font-normal text-gray-400">/ 1 vidéo dédiée</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#08080D]/70 border border-white/5 flex justify-between">
                  <span className="text-gray-300">Pack 3 Vidéos (Campagne Niche) :</span>
                  <span className="font-bold text-[#00FFC6]">{bundleRate} €</span>
                </div>
                <div className="p-3 rounded-xl bg-[#08080D]/70 border border-white/5 flex justify-between">
                  <span className="text-gray-300">Cession de droits publicitaires (Spark Ads 30j) :</span>
                  <span className="font-bold text-white">+{Math.round(baseRate * 0.4)} €</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert(`Devis type généré : ${baseRate}€ HT pour 1 vidéo TikTok dédiée.`)}
              className="mt-6 w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white font-bold text-xs transition-all shadow-md shadow-[#7C3AED]/20"
            >
              Télécharger le Modèle de Devis Sponsor
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Creator Rewards (RPM) Calculator */}
      {activeTab === 'rewards' && (
        <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">
                Simulateur TikTok Creator Rewards Program (Vidéos &gt; 1 minute)
              </h3>
              <p className="text-xs text-gray-400">
                Basé sur les RPM actuels constatés en France et en Europe pour la niche {niche.name}.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs">
              RPM Moyen : {rpmRate.toFixed(2)} €
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>Vues mensuelles qualifiées (&gt;1 min) :</span>
                  <span className="font-bold text-white font-mono">
                    {(estimatedMonthlyViews / 1000000).toFixed(1)} Millions
                  </span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={10000000}
                  step={100000}
                  value={estimatedMonthlyViews}
                  onChange={(e) => setEstimatedMonthlyViews(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>RPM (€ pour 1 000 vues qualifiées) :</span>
                  <span className="font-bold text-white font-mono">{rpmRate.toFixed(2)} €</span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.0}
                  step={0.05}
                  value={rpmRate}
                  onChange={(e) => setRpmRate(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-[#1A1A27] border border-amber-500/30 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Gain Mensuel Estimé du Programme
                </span>
                <h4 className="text-3xl font-black text-amber-400 mt-2 mb-2">
                  {monthlyRewardsEst.toLocaleString()} € <span className="text-xs text-gray-400">/ mois</span>
                </h4>
                <p className="text-xs text-gray-300">
                  Soit environ {Math.round(monthlyRewardsEst * 12).toLocaleString()} € par an uniquement avec les vues TikTok France.
                </p>
              </div>

              <div className="text-[10px] text-gray-400 pt-3 border-t border-white/5">
                Critères : Vidéos originales de plus de 60 secondes, vues dans la région éligible.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
