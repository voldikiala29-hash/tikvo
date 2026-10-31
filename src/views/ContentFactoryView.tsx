import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  Copy,
  Check,
  Calendar,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Music,
  ShoppingBag,
  Clock,
  Sliders,
  ChevronDown,
  RefreshCw,
  Zap,
  Video,
  Download,
  Film,
  Layers,
  Volume2,
  Mic,
  Eye,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  NicheData,
  VideoTemplate,
  ViralHook,
  TrendingSound,
  TrendingHashtag,
  ScheduledPost,
} from '../types/tiktok';
import { RemotionViralPlayer } from '../video-engine/RemotionViralPlayer';
import { ViralTemplateProps } from '../video-engine/types';
import { videoEngineService } from '../video-engine/engineService';
import { TIKTOK_FREE_VOICES } from '../video-engine/edgeTtsService';

interface ContentFactoryViewProps {
  niche: NicheData;
  onSchedulePost: (post: ScheduledPost) => void;
  preloadedItem?: {
    sound?: TrendingSound;
    template?: VideoTemplate;
    hookText?: string;
  };
}

export const ContentFactoryView: React.FC<ContentFactoryViewProps> = ({
  niche,
  onSchedulePost,
  preloadedItem,
}) => {
  // Current Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    preloadedItem?.template?.id || niche.templates[0]?.id || ''
  );

  // Hook state
  const [activeHook, setActiveHook] = useState<string>(
    preloadedItem?.hookText || niche.hooks[0]?.text || ''
  );

  // Voice selection (edge-tts)
  const [selectedVoice, setSelectedVoice] = useState<string>(TIKTOK_FREE_VOICES[0].id);

  // Settings
  const [duration, setDuration] = useState<'15s' | '30s' | '60s'>('30s');
  const [tone, setTone] = useState<'Punchy' | 'Éducatif' | 'Mystérieux' | 'Storytelling'>('Punchy');
  const [ctaGoal, setCtaGoal] = useState<'TikTok Shop' | 'Commentaires' | 'Abonnement' | 'Sauvegarde'>('TikTok Shop');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [scheduledSuccess, setScheduledSuccess] = useState<boolean>(false);

  // View Mode in Phone Frame: 'remotion' or 'tiktok'
  const [previewMode, setPreviewMode] = useState<'remotion' | 'tiktok'>('remotion');

  // Phone preview states for TikTok mode
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [likesCount, setLikesCount] = useState<number>(14200);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  // Remotion Dynamic Props State
  const [remotionProps, setRemotionProps] = useState<ViralTemplateProps | null>(null);
  const [isLoadingProps, setIsLoadingProps] = useState<boolean>(false);

  // Video Engine Generation Modal State
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationPercent, setGenerationPercent] = useState<number>(0);
  const [generatedVideoResult, setGeneratedVideoResult] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);

  // When niche changes, update template and hook defaults!
  useEffect(() => {
    if (niche.templates.length > 0) {
      setSelectedTemplateId(niche.templates[0].id);
    }
    if (niche.hooks.length > 0) {
      setActiveHook(niche.hooks[0].text);
    }
  }, [niche.id]);

  // Current selected template object
  const currentTemplate =
    niche.templates.find((t) => t.id === selectedTemplateId) || niche.templates[0];

  // Active Sound for preview
  const activeSound =
    preloadedItem?.sound || niche.sounds[0] || {
      title: 'Trending Viral Audio',
      artist: 'tikvo Sounds',
    };

  // Generated Script Structure
  const [scriptTitle, setScriptTitle] = useState(
    currentTemplate ? currentTemplate.title : `Vidéo Virale ${niche.name}`
  );

  // Timeline sections
  const [sections, setSections] = useState([
    {
      timecode: '0:00 - 0:03',
      title: '1. Hook Visuel & Choc',
      action: 'Plan serré face cam ou résultat spectaculaire en gros plan. Zoom avant x1.2 dès la seconde 0.',
      speech: activeHook,
      onScreenText: activeHook.toUpperCase().slice(0, 35) + '...',
      soundFx: 'Impact Whoosh + Bass Drop',
    },
    {
      timecode: '0:03 - 0:09',
      title: '2. Problème & Frustration (Tension)',
      action: 'Afficher l’erreur ou le problème que la cible vit tous les jours.',
      speech: `95% des gens dans la niche ${niche.name} font cette erreur sans même s'en rendre compte, et ça détruit leurs résultats.`,
      onScreenText: 'NE FAIS PLUS ÇA ! ❌',
      soundFx: 'Tension Chime',
    },
    {
      timecode: '0:09 - 0:20',
      title: '3. Révélation de la Méthode (La Solution)',
      action: 'Démonstration fluide étape par étape. Pas de blabla, juste la technique concrète.',
      speech: `Regarde bien cette astuce : il te suffit de changer ce seul réglage et de combiner ces 2 étapes.`,
      onScreenText: 'L’ASTUCE DU CHEF 💡',
      soundFx: 'Ding Réussite',
    },
    {
      timecode: '0:20 - 0:26',
      title: '4. Preuve & Climax',
      action: 'Montrer le résultat final irréprochable et le contraste avant / après.',
      speech: `Le résultat parle de lui-même. C’est propre, rapide et à la portée de tout le monde.`,
      onScreenText: 'RÉSULTAT DIRECT 🔥',
      soundFx: 'Beat Drop Électro',
    },
    {
      timecode: '0:26 - 0:30',
      title: '5. Appel à l’Action Monétisé (CTA)',
      action: 'Pointe vers le panier TikTok Shop ou le lien en bio.',
      speech:
        ctaGoal === 'TikTok Shop'
          ? `J’ai lié le produit exact dans le panier orange TikTok Shop juste en dessous pour profiter de la promo.`
          : `Dis-moi en commentaire si tu connaissais déjà ça, et abonne-toi pour ne rien rater !`,
      onScreenText: ctaGoal === 'TikTok Shop' ? 'PANIER TIKTOK SHOP CI-DESSOUS 🛍️' : 'ABONNE-TOI POUR PLUS 🚀',
      soundFx: 'Cash Register SFX',
    },
  ]);

  // Load Remotion props whenever active hook, niche, or script changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingProps(true);

    const fullScriptText = sections.map((s) => s.speech).join(' ');
    const keywords = [niche.id, niche.name, currentTemplate?.title || ''];

    videoEngineService
      .prepareRemotionProps(niche.id, niche.name, activeHook, fullScriptText, keywords)
      .then((res) => {
        if (isMounted) {
          setRemotionProps(res.props);
          setIsLoadingProps(false);
        }
      })
      .catch((err) => {
        console.error('Error preparing Remotion props:', err);
        if (isMounted) setIsLoadingProps(false);
      });

    return () => {
      isMounted = false;
    };
  }, [niche.id, activeHook, scriptTitle, sections]);

  // Sync script when activeHook or template changes
  const handleRegenerateScript = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setScriptTitle(currentTemplate.title);
      setSections([
        {
          timecode: '0:00 - 0:03',
          title: '1. Hook Visuel & Choc',
          action: 'Plan serré visage ou résultat bluffant dès la première frame.',
          speech: activeHook,
          onScreenText: activeHook.toUpperCase().slice(0, 40),
          soundFx: 'Impact Whoosh + Bass Drop',
        },
        {
          timecode: '0:03 - 0:08',
          title: '2. Problème & Tension',
          action: 'Créer de l’urgence : pourquoi la plupart des gens se trompent.',
          speech: `Si tu veux réussir dans ${niche.name}, tu dois absolument arrêter cette mauvaise habitude.`,
          onScreenText: 'ARRETE ÇA TOUT DE SUITE ! 🚫',
          soundFx: 'Suspense Sound',
        },
        {
          timecode: '0:08 - 0:19',
          title: '3. Démonstration Pas-à-Pas',
          action: 'Plan cut rapide toutes les 1.8 secondes avec b-roll.',
          speech: `Voici la règle d'or : applique cette technique exacte en 3 mouvements simples.`,
          onScreenText: 'METHODE SECRETE ⚡',
          soundFx: 'Pop sound + Upbeat rhythm',
        },
        {
          timecode: '0:19 - 0:25',
          title: '4. Preuve Finale',
          action: 'Gros plan satisfaisant sur la réussite finale.',
          speech: `Regarde la différence, c’est 10x plus efficace et ça ne m’a pris que 30 secondes.`,
          onScreenText: 'MAGIQUE ✨',
          soundFx: 'Chime Satisfaisant',
        },
        {
          timecode: '0:25 - 0:30',
          title: '5. Monétisation & Conversion',
          action: 'Animation du doigt pointant vers le bas de l’écran.',
          speech:
            ctaGoal === 'TikTok Shop'
              ? `Le produit vérifié est disponible directement dans le panier TikTok Shop avec livraison express.`
              : `Enregistre cette vidéo pour la retrouver plus tard et laisse un commentaire !`,
          onScreenText: ctaGoal === 'TikTok Shop' ? 'VOIR LE PANIER ORANGE 🛒' : 'ENREGISTRE CE POST 📌',
          soundFx: 'Cash Register SFX',
        },
      ]);
      setIsGenerating(false);
    }, 400);
  };

  // Run the full free video engine (Pexels + edge-tts + Remotion 1080x1920)
  const handleLaunchFreeVideoEngine = async (autoPost: boolean = false) => {
    setIsGeneratingVideo(true);
    setShowVideoModal(true);
    setGenerationPercent(5);
    setGenerationStep('Démarrage du Moteur Vidéo Gratuit tikvo...');

    const fullScript = sections.map((s) => s.speech).join(' ');
    const keywords = [niche.id, niche.name, 'aesthetic', 'vertical'];

    try {
      const res = await videoEngineService.generateVideo(
        {
          niche: { id: niche.id, name: niche.name },
          script: fullScript,
          hook: activeHook,
          keywords: keywords,
          voice: selectedVoice,
          pexelsIds: [],
        },
        (step, pct) => {
          setGenerationStep(step);
          setGenerationPercent(pct);
        }
      );

      setGeneratedVideoResult(res);
      setIsGeneratingVideo(false);
    } catch (err: any) {
      console.error(err);
      setGenerationStep('Erreur de rendu vidéo : ' + err.message);
      setIsGeneratingVideo(false);
    }
  };

  // Video preview subtitle loop simulation for TikTok mode
  useEffect(() => {
    let interval: any;
    if (isPlaying && previewMode === 'tiktok') {
      interval = setInterval(() => {
        setCurrentTime((prev) => (prev >= 30 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, previewMode]);

  const activeSubtitle =
    currentTime < 3
      ? sections[0]?.speech
      : currentTime < 8
      ? sections[1]?.speech
      : currentTime < 19
      ? sections[2]?.speech
      : currentTime < 25
      ? sections[3]?.speech
      : sections[4]?.speech;

  const handleCopyScript = () => {
    const fullText = `TITRE : ${scriptTitle}\nNICHE : ${niche.name}\nSON : ${activeSound.title}\nHASHTAGS : ${niche.hashtags.map((h) => h.tag).join(' ')}\n\n` +
      sections.map((s) => `[${s.timecode}] ${s.title}\nAction : ${s.action}\nParole : "${s.speech}"\nTexte écran : [${s.onScreenText}]\n`).join('\n');
    navigator.clipboard.writeText(fullText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleSchedulePost = () => {
    const newPost: ScheduledPost = {
      id: 'sched_' + Date.now(),
      accountId: niche.accounts[0]?.id || 'acc-1',
      accountHandle: niche.accounts[0]?.handle || '@tikvo_creator',
      nicheId: niche.id,
      title: scriptTitle,
      hook: activeHook,
      caption: `${scriptTitle} ! 🚀 Découvre l'astuce ultime pour la niche ${niche.name}. Lien dans le panier TikTok Shop 👇 ${niche.hashtags.map((h) => h.tag).join(' ')}`,
      soundTitle: activeSound.title,
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: niche.targetAudience.peakHours[0] || '18:15',
      status: 'queued',
      format: currentTemplate.title,
      duration: duration,
      thumbnailGradient: 'from-pink-600 via-purple-600 to-cyan-500',
    };
    onSchedulePost(newPost);
    setScheduledSuccess(true);
    setTimeout(() => setScheduledSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="p-6 rounded-2xl bg-[#12121A]/90 border border-white/5 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white lowercase">tikvo content factory</h1>
            <span className="text-xl">{niche.emoji}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#00FFC6]/20 text-[#00FFC6] text-[10px] font-bold border border-[#00FFC6]/30">
              Remotion + edge-tts + Pexels
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Génération complète de vidéos 9:16 avec zoom Ken Burns, Hook 0-3s agrandi, sous-titres karaoké cyan et musique duckée. 100% gratuit.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent FREE VIDEO ENGINE CTA BUTTON */}
          <button
            onClick={() => handleLaunchFreeVideoEngine(false)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00FFC6] via-[#7C3AED] to-[#FF2E93] text-black font-black text-xs transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#00FFC6]/25"
          >
            <Video size={16} className="text-black" />
            <span className="uppercase tracking-wider font-extrabold">Générer Vidéo Gratuite</span>
          </button>

          <button
            onClick={handleCopyScript}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 transition-all"
          >
            {copiedScript ? (
              <>
                <Check size={14} className="text-[#00FFC6]" />
                <span className="text-[#00FFC6]">Copié !</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copier Script</span>
              </>
            )}
          </button>

          <button
            onClick={handleSchedulePost}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A1A27] hover:bg-[#252538] border border-white/10 text-white text-xs font-bold transition-all"
          >
            {scheduledSuccess ? (
              <>
                <Check size={14} className="text-[#00FFC6]" />
                <span className="text-[#00FFC6]">Planifié !</span>
              </>
            ) : (
              <>
                <Calendar size={14} />
                <span>Programmer</span>
              </>
            )}
          </button>

        </div>
      </div>


      {/* Main Grid: Left Script Builder, Right 9:16 Phone Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Script Generator Controls & Sections (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Step 1: Select Template for Niche */}
          <div className="p-5 rounded-2xl bg-[#12121A]/90 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>1. Template de Niche : {niche.name}</span>
                <span className="text-[10px] text-[#00FFC6]">({niche.templates.length} disponibles)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {niche.templates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      setScriptTitle(tpl.title);
                      setActiveHook(tpl.exampleHook);
                    }}
                    className={`p-3 rounded-xl text-left transition-all border ${
                      isSelected
                        ? 'bg-[#1A1A27] border-[#00FFC6] text-white shadow-md shadow-[#00FFC6]/10'
                        : 'bg-[#08080D]/70 border-white/5 hover:border-white/10 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate">{tpl.title}</span>
                      <span className="text-[9px] font-bold text-[#00FFC6] bg-[#00FFC6]/10 px-1.5 py-0.2 rounded">
                        {tpl.avgRetention}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-1">{tpl.structure}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Clickable Hooks Bank */}
          <div className="p-5 rounded-2xl bg-[#12121A]/90 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                2. Hooks Psychologiques Cliquables (0-3s)
              </label>
              <span className="text-[10px] text-[#00FFC6] font-mono">Zoom animé scale 0.8 → 1.1</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {niche.hooks.map((hk) => {
                const isCurrent = activeHook === hk.text;
                return (
                  <button
                    key={hk.id}
                    onClick={() => setActiveHook(hk.text)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-all border ${
                      isCurrent
                        ? 'bg-[#FF2E93]/20 border-[#FF2E93] text-white font-bold shadow-sm'
                        : 'bg-[#08080D] border-white/5 hover:border-white/20 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase font-bold text-gray-400">
                        {hk.category}
                      </span>
                      <span>"{hk.text.slice(0, 48)}..."</span>
                      <span className="text-[10px] text-[#00FFC6] font-mono">
                        {hk.retentionRate}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Hook Input */}
            <div className="pt-2">
              <input
                type="text"
                value={activeHook}
                onChange={(e) => setActiveHook(e.target.value)}
                placeholder="Ou saisis ton propre hook personnalisé..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFC6]"
              />
            </div>
          </div>

          {/* Step 3: Edge-TTS Voice & Parameters */}
          <div className="p-5 rounded-2xl bg-[#12121A]/90 border border-white/5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Free edge-tts TikTok Voice Selector */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <Mic size={12} className="text-[#00FFC6]" />
                  <span>Voix TikTok Gratuite (edge-tts)</span>
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00FFC6]"
                >
                  {TIKTOK_FREE_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* CTA Goal */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Objectif CTA Monétisé
                </label>
                <select
                  value={ctaGoal}
                  onChange={(e: any) => setCtaGoal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00FFC6]"
                >
                  <option value="TikTok Shop">Panier TikTok Shop</option>
                  <option value="Commentaires">Débat en Commentaires</option>
                  <option value="Abonnement">Follow & Sauvegarde</option>
                  <option value="Sauvegarde">Lien Bio / Lead Magnet</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Durée Vidéo
                </label>
                <div className="flex rounded-xl bg-[#08080D] p-1 border border-white/5 text-xs">
                  {(['15s', '30s', '60s'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                        duration === d ? 'bg-[#00FFC6] text-black' : 'text-gray-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Tonalité du Script
                </label>
                <select
                  value={tone}
                  onChange={(e: any) => setTone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#08080D] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00FFC6]"
                >
                  <option value="Punchy">Punchy & Rapide</option>
                  <option value="Éducatif">Éducatif & Expert</option>
                  <option value="Mystérieux">Mystérieux & Révélation</option>
                  <option value="Storytelling">Storytelling Intime</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Audio assigné : <strong className="text-white">{activeSound.title}</strong>
              </span>
              <button
                onClick={handleRegenerateScript}
                disabled={isGenerating}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#00FFC6] to-[#7C3AED] text-black font-extrabold text-xs flex items-center gap-1.5 hover:opacity-95 transition-all shadow-md shadow-[#00FFC6]/20"
              >
                <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
                <span>Régénérer Script</span>
              </button>
            </div>
          </div>

          {/* Step 4: Complete Script Breakdown Timeline */}
          <div className="p-5 rounded-2xl bg-[#12121A]/90 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Découpage Séquencé du Script (5 Étapes Clés)
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">30 secondes totales</span>
            </div>

            <div className="space-y-3">
              {sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#1A1A27] border border-white/5 hover:border-white/10 space-y-2 text-xs transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#00FFC6] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#00FFC6]/15 text-[#00FFC6] text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      {sec.title}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40 text-gray-400 border border-white/5">
                      {sec.timecode}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-300">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Paroles Voix Off :</p>
                      <p className="italic text-white">"{sec.speech}"</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Texte Incrusté Écran :</p>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold text-[10px]">
                        {sec.onScreenText}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
                    <span>🎬 Action : {sec.action}</span>
                    <span className="text-purple-400">🔊 SFX : {sec.soundFx}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Dual-Mode Smartphone 9:16 Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start sticky top-20">
          {/* Mode Switcher Tabs */}
          <div className="mb-3 flex items-center gap-1.5 bg-[#12121A] p-1 rounded-2xl border border-white/10 shadow-lg">
            <button
              onClick={() => setPreviewMode('remotion')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                previewMode === 'remotion'
                  ? 'bg-gradient-to-r from-[#00FFC6] to-[#00B8D9] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Film size={13} />
              <span>Remotion 9:16 (Ken Burns)</span>
            </button>
            <button
              onClick={() => setPreviewMode('tiktok')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                previewMode === 'tiktok'
                  ? 'bg-[#FF2E93] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Eye size={13} />
              <span>Simulateur TikTok</span>
            </button>
          </div>

          {/* Smartphone Mockup Frame */}
          <div className="w-[320px] h-[640px] rounded-[42px] bg-black border-[7px] border-[#222230] shadow-2xl shadow-[#00FFC6]/15 relative overflow-hidden flex flex-col select-none">
            {/* Phone Notch & Speaker */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-[#12121A] rounded-full z-40 flex items-center justify-center">
              <div className="w-10 h-1 bg-white/20 rounded-full"></div>
            </div>

            {/* TAB 1: REMOTION 9:16 VIDEO ENGINE PLAYER */}
            {previewMode === 'remotion' && remotionProps ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#08080D]">
                <RemotionViralPlayer templateProps={remotionProps} autoPlay={true} loop={true} />
              </div>
            ) : previewMode === 'remotion' && isLoadingProps ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#08080D] text-center p-4">
                <RefreshCw size={28} className="text-[#00FFC6] animate-spin mb-2" />
                <p className="text-xs text-white font-bold">Chargement de la composition Remotion...</p>
                <p className="text-[10px] text-gray-400 mt-1">Clips Pexels 4K + Timings Karaoké</p>
              </div>
            ) : null}

            {/* TAB 2: TIKTOK LIVE OVERLAY MOCKUP */}
            {previewMode === 'tiktok' && (
              <>
                {/* Simulated TikTok Video Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/60 via-slate-900 to-black z-0 flex items-center justify-center overflow-hidden">
                  <div
                    className={`absolute w-72 h-72 rounded-full bg-gradient-to-tr from-[#FF2E93]/40 to-[#00FFC6]/40 blur-3xl transition-transform duration-1000 ${
                      isPlaying ? 'scale-125 animate-pulse' : 'scale-95'
                    }`}
                  />

                  {/* Central Play/Pause Button */}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white z-20 hover:scale-105 transition-all"
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} fill="white" className="ml-1" />}
                  </button>

                  {/* Karaoke Subtitle Badge at video center */}
                  <div className="absolute top-1/2 -translate-y-12 left-4 right-4 z-20 text-center px-2">
                    <span className="inline-block px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-xs font-black text-white shadow-2xl tracking-tight leading-snug">
                      {activeSubtitle}
                    </span>
                    <div className="mt-1">
                      <span className="px-2 py-0.5 rounded bg-[#00FFC6] text-black font-extrabold text-[9px]">
                        {currentTime}s / 30s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Bar inside Phone */}
                <div className="relative z-30 pt-7 px-4 flex items-center justify-between text-xs font-bold text-white/80">
                  <div className="w-6"></div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <span className="text-white/50">Abonnements</span>
                    <div className="relative">
                      <span className="text-white font-extrabold">Pour toi</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="w-6 text-right">🔍</div>
                </div>

                {/* Right Action Bar */}
                <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center gap-4 text-white">
                  <div className="relative">
                    <img
                      src={niche.accounts[0]?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt="Creator"
                      className="w-10 h-10 rounded-full border-2 border-white object-cover"
                    />
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#FF2E93] text-white flex items-center justify-center text-[10px] font-bold">
                      +
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setIsLiked(!isLiked);
                      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
                    }}
                    className="flex flex-col items-center gap-0.5 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-125">
                      <Heart
                        size={22}
                        className={isLiked ? 'text-[#FF2E93] fill-[#FF2E93]' : 'text-white'}
                      />
                    </div>
                    <span className="text-[10px] font-bold drop-shadow">
                      {(likesCount / 1000).toFixed(1)}k
                    </span>
                  </button>

                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                      <MessageCircle size={21} className="text-white" />
                    </div>
                    <span className="text-[10px] font-bold drop-shadow">482</span>
                  </div>

                  <button
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                      <Bookmark
                        size={21}
                        className={isBookmarked ? 'text-amber-400 fill-amber-400' : 'text-white'}
                      />
                    </div>
                    <span className="text-[10px] font-bold drop-shadow">1.8k</span>
                  </button>

                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                      <Share2 size={21} className="text-white" />
                    </div>
                    <span className="text-[10px] font-bold drop-shadow">940</span>
                  </div>

                  <div
                    className={`w-9 h-9 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center ${
                      isPlaying ? 'animate-spin' : ''
                    }`}
                    style={{ animationDuration: '4s' }}
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#00FFC6] to-[#FF2E93]"></div>
                  </div>
                </div>

                {/* Bottom Overlay */}
                <div className="absolute left-3 right-16 bottom-5 z-30 space-y-2 text-white">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs drop-shadow">
                      {niche.accounts[0]?.handle || '@tikvo_creator'}
                    </span>
                    <span className="px-1 py-0.2 rounded bg-white/20 text-[9px] font-bold">
                      tikvo
                    </span>
                  </div>

                  <p className="text-[11px] leading-tight drop-shadow font-medium line-clamp-2">
                    {scriptTitle} ⚡ {activeHook}
                  </p>

                  <div className="flex flex-wrap gap-1 text-[10px] text-[#00FFC6] font-bold drop-shadow">
                    {niche.hashtags.slice(0, 3).map((h) => (
                      <span key={h.id}>{h.tag}</span>
                    ))}
                  </div>

                  {ctaGoal === 'TikTok Shop' && (
                    <div className="p-1.5 px-2 rounded-lg bg-amber-500/90 text-black flex items-center gap-1.5 text-[10px] font-black shadow-lg">
                      <ShoppingBag size={12} />
                      <span className="truncate">{niche.products[0]?.name || 'Produit Tendance'}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[10px] text-white/90 drop-shadow">
                    <Music size={11} className="text-[#00FFC6]" />
                    <span className="truncate max-w-[160px] font-medium">
                      {activeSound.title} - {activeSound.artist}
                    </span>
                  </div>
                </div>

                {/* Video Progress Bar */}
                <div className="absolute bottom-1 left-0 right-0 h-1 bg-white/20 z-40">
                  <div
                    style={{ width: `${(currentTime / 30) * 100}%` }}
                    className="h-full bg-white transition-all duration-300"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Free Video Engine Live Progress / Export Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-[#12121A] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00FFC6] to-[#7C3AED] p-0.5">
                  <div className="w-full h-full bg-[#08080D] rounded-[10px] flex items-center justify-center text-white">
                    <Film size={20} className="text-[#00FFC6]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-white text-base lowercase">
                    tikvo video-engine : 1080x1920
                  </h3>
                  <p className="text-xs text-gray-400">
                    Remotion 9:16 + edge-tts + Pexels 4K
                  </p>
                </div>
              </div>

              {!isGeneratingVideo && (
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Progress Bar & Status */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-white">{generationStep}</span>
                <span className="font-mono text-[#00FFC6] font-extrabold">{generationPercent}%</span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-[#08080D] overflow-hidden border border-white/5">
                <div
                  style={{ width: `${generationPercent}%` }}
                  className="h-full bg-gradient-to-r from-[#00FFC6] via-[#7C3AED] to-[#FF2E93] transition-all duration-300"
                />
              </div>

              {/* 5-Step Checklist */}
              <div className="space-y-2 text-xs text-gray-300 pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={generationPercent >= 20 ? 'text-[#00FFC6]' : 'text-gray-600'}
                  />
                  <span>1. Récupération des 3 clips Pexels selon les keywords de {niche.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={generationPercent >= 45 ? 'text-[#00FFC6]' : 'text-gray-600'}
                  />
                  <span>2. Synthèse vocale edge-tts TikTok French + timestamps karaoké</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={generationPercent >= 75 ? 'text-[#00FFC6]' : 'text-gray-600'}
                  />
                  <span>3. Montage Remotion : Zoom Ken Burns + Hook 0-3s animé + Barre rose</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={generationPercent >= 90 ? 'text-[#00FFC6]' : 'text-gray-600'}
                  />
                  <span>4. Rendu MP4 1080x1920 à 30fps haute fidélité</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={generationPercent === 100 ? 'text-[#00FFC6]' : 'text-gray-600'}
                  />
                  <span>5. Vidéo prête au téléchargement</span>
                </div>
              </div>
            </div>

            {/* Finished state actions */}
            {!isGeneratingVideo && generatedVideoResult && (
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="p-3 rounded-xl bg-[#08080D] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-gray-400">ID de rendu :</span>
                  <span className="font-mono text-[#00FFC6] font-bold">{generatedVideoResult.renderId}</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = generatedVideoResult.videoUrl;
                      link.download = `tikvo-${niche.id}-${Date.now()}.mp4`;
                      link.click();
                    }}
                    className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Download size={14} />
                    <span>Télécharger MP4</span>
                  </button>

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
