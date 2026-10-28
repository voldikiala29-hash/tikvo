import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ViralIdeasModal } from './components/ViralIdeasModal';
import { ConnectTikTokModal } from './components/ConnectTikTokModal';
import { CustomNicheModal } from './components/CustomNicheModal';
import { FirebaseModal } from './components/FirebaseModal';
import { DashboardView } from './views/DashboardView';
import { RadarViralView } from './views/RadarViralView';
import { ContentFactoryView } from './views/ContentFactoryView';
import { AccountsView } from './views/AccountsView';
import { CalendarView } from './views/CalendarView';
import { MonetizationView } from './views/MonetizationView';
import { SettingsView } from './views/SettingsView';
import { INITIAL_NICHES, generate10ViralIdeas } from './data/nichesData';
import { NicheData, NicheId, ScheduledPost, ViralIdea } from './types/tiktok';
import { tikTokApiService } from './services/tiktokApiService';
import { FirebaseProvider, useFirebase } from './contexts/FirebaseContext';
import { useLocation, useNavigate } from 'react-router-dom';

function TikvoDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    user,
    isFirebaseConfigured,
    saveCustomNiche,
    saveScheduledPost,
    firestoreCustomNiches,
    firestoreScheduledPosts,
  } = useFirebase();

  // Load saved custom niches from localStorage if any
  const [localNiches, setLocalNiches] = useState<Record<string, NicheData>>(() => {
    try {
      const saved = localStorage.getItem('TIKVO_NICHES') || localStorage.getItem('TIKOKVOLDI_NICHES');
      if (saved) {
        return { ...INITIAL_NICHES, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_NICHES;
  });

  // Combine initial niches, local niches, and real-time Firestore niches
  const niches = useMemo(() => {
    return {
      ...INITIAL_NICHES,
      ...localNiches,
      ...firestoreCustomNiches,
    };
  }, [localNiches, firestoreCustomNiches]);

  // Active Niche State
  const [selectedNiche, setSelectedNiche] = useState<NicheId>('mode');

  // Active Main Navigation View (derived and synced with HashRouter)
  const [currentView, setCurrentView] = useState<string>(() => {
    const hashRoute = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0];
    return ['dashboard', 'radar', 'factory', 'accounts', 'calendar', 'monetization', 'settings'].includes(hashRoute)
      ? hashRoute
      : 'dashboard';
  });

  // Sync route with currentView
  useEffect(() => {
    const rawPath = location.pathname.replace(/^\//, '').split('/')[0];
    if (['dashboard', 'radar', 'factory', 'accounts', 'calendar', 'monetization', 'settings'].includes(rawPath)) {
      setCurrentView(rawPath);
    } else if (!rawPath) {
      setCurrentView('dashboard');
    }
  }, [location.pathname]);

  // Mobile sidebar (off-canvas under the lg breakpoint)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const handleNavigateView = (view: string) => {
    setIsSidebarOpen(false);
    setCurrentView(view);
    navigate(view === 'dashboard' ? '/' : `/${view}`);
  };

  // TikTok API Connection State
  const [isTikTokConnected, setIsTikTokConnected] = useState<boolean>(() =>
    tikTokApiService.isConnected()
  );

  // Modals state
  const [isViralIdeasModalOpen, setIsViralIdeasModalOpen] = useState<boolean>(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isCustomNicheModalOpen, setIsCustomNicheModalOpen] = useState<boolean>(false);

  // Scheduled posts storage (localStorage fallback)
  const [localScheduledPosts, setLocalScheduledPosts] = useState<ScheduledPost[]>(() => {
    try {
      const saved = localStorage.getItem('TIKVO_SCHEDULED_POSTS') || localStorage.getItem('TIKOKVOLDI_SCHEDULED_POSTS');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'init-post-1',
        accountId: 'acc-m1',
        accountHandle: '@tikvo_fashion_pro',
        nicheId: 'mode',
        title: '3 tenues avec 1 seule pièce',
        hook: 'Arrête d’acheter 50 pantalons : voici 3 tenues d’élite.',
        caption: 'Découvre comment rentabiliser ton dressing en 2026 ! #FashionTok #QuietLuxury',
        soundTitle: 'Chic Parisian Night',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '18:15',
        status: 'queued',
        format: 'Transition Snap & Switch',
        duration: '18s',
        thumbnailGradient: 'from-pink-600 via-purple-600 to-indigo-800',
      },
    ];
  });

  // Combine scheduled posts with Firestore real-time collection if authenticated
  const scheduledPosts = useMemo(() => {
    if (user && firestoreScheduledPosts.length > 0) {
      const map = new Map<string, ScheduledPost>();
      localScheduledPosts.forEach((p) => map.set(p.id, p));
      firestoreScheduledPosts.forEach((p) => map.set(p.id, p));
      return Array.from(map.values());
    }
    return localScheduledPosts;
  }, [user, firestoreScheduledPosts, localScheduledPosts]);

  // Preloaded item for Content Factory when transitioning from Radar or 10 Ideas
  const [factoryPreloadedItem, setFactoryPreloadedItem] = useState<any>(undefined);

  // Current Niche Data object
  const currentNicheData = niches[selectedNiche] || niches.mode;

  // 10 Ideas for current niche
  const [viralIdeas, setViralIdeas] = useState<ViralIdea[]>(() =>
    generate10ViralIdeas(selectedNiche, currentNicheData)
  );

  // When selected niche changes, re-generate the 10 viral ideas for it
  useEffect(() => {
    setViralIdeas(generate10ViralIdeas(selectedNiche, currentNicheData));
  }, [selectedNiche, currentNicheData]);

  // Persist local scheduled posts
  useEffect(() => {
    try {
      localStorage.setItem('TIKVO_SCHEDULED_POSTS', JSON.stringify(localScheduledPosts));
    } catch (e) {
      console.error(e);
    }
  }, [localScheduledPosts]);

  // Add a newly created custom niche (syncs to LocalStorage and Firestore)
  const handleAddCustomNiche = async (newNiche: NicheData) => {
    setLocalNiches((prev) => {
      const updated = { ...prev, [newNiche.id]: newNiche };
      try {
        localStorage.setItem('TIKVO_NICHES', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // Save to Firestore if user is authenticated and configured
    if (user && isFirebaseConfigured) {
      try {
        await saveCustomNiche(newNiche);
      } catch (err) {
        console.warn('[Firestore] Sauvegarde locale conservée:', err);
      }
    }

    setSelectedNiche(newNiche.id);
  };

  // Trigger 10 viral ideas modal
  const handleOpen10Ideas = () => {
    setIsViralIdeasModalOpen(true);
  };

  // Transfer idea from 10 ideas modal directly to Content Factory
  const handleSelectIdeaForFactory = (idea: ViralIdea) => {
    setFactoryPreloadedItem({
      hookText: idea.hook,
      template: {
        id: 'custom-tpl-' + idea.id,
        title: idea.title,
        structure: idea.concept,
        avgRetention: `${idea.viralScore}%`,
        bestDuration: idea.idealDuration,
        exampleHook: idea.hook,
        description: idea.concept,
        recommendedSoundType: idea.soundType,
      },
    });
    setIsViralIdeasModalOpen(false);
    handleNavigateView('factory');
  };

  // Transfer item from Radar Viral table to Content Factory
  const handleSelectRadarItemForFactory = (item: any) => {
    setFactoryPreloadedItem(item);
    handleNavigateView('factory');
  };

  // Schedule a post (syncs to LocalStorage and Firestore)
  const handleSchedulePost = async (newPost: ScheduledPost) => {
    setLocalScheduledPosts((prev) => [newPost, ...prev]);

    if (user && isFirebaseConfigured) {
      try {
        await saveScheduledPost(newPost);
      } catch (err) {
        console.warn('[Firestore] Sauvegarde locale conservée:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#08080D] text-[#F1F1F6] flex">
      {/* 1. Left Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={handleNavigateView}
        selectedNiche={selectedNiche}
        setSelectedNiche={setSelectedNiche}
        niches={niches}
        onOpenCustomNicheModal={() => setIsCustomNicheModalOpen(true)}
        isTikTokConnected={isTikTokConnected}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 2. Topbar */}
        <Topbar
          selectedNiche={selectedNiche}
          setSelectedNiche={setSelectedNiche}
          niches={niches}
          onOpenCustomNicheModal={() => setIsCustomNicheModalOpen(true)}
          onGenerate10Ideas={handleOpen10Ideas}
          isTikTokConnected={isTikTokConnected}
          onOpenConnectModal={() => setIsConnectModalOpen(true)}
          onOpenMenu={() => setIsSidebarOpen(true)}
        />

        {/* 3. Dynamic Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-64 overflow-y-auto">
          {/* Alerte si la configuration Firebase est manquante */}
          {!isFirebaseConfigured && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between text-amber-200 text-xs sm:text-sm shadow-lg shadow-amber-950/20">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <div>
                  <span className="font-bold text-amber-300">Config Firebase manquante</span>
                  <span className="mx-1.5 text-amber-500">•</span>
                  <span className="text-gray-300">
                    Mode local actif. Vos niches, scripts et posts sont enregistrés dans ce navigateur.
                  </span>
                </div>
              </div>
              <span className="text-amber-400/80 text-[11px] hidden md:inline bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-mono">
                Secrets VITE_FIREBASE_* optionnels
              </span>
            </div>
          )}

          {currentView === 'dashboard' && (
            <DashboardView
              niche={currentNicheData}
              onNavigate={handleNavigateView}
              onGenerate10Ideas={handleOpen10Ideas}
              scheduledPosts={scheduledPosts}
            />
          )}

          {currentView === 'radar' && (
            <RadarViralView
              niche={currentNicheData}
              onSelectForFactory={handleSelectRadarItemForFactory}
            />
          )}

          {currentView === 'factory' && (
            <ContentFactoryView
              niche={currentNicheData}
              onSchedulePost={handleSchedulePost}
              preloadedItem={factoryPreloadedItem}
            />
          )}

          {currentView === 'accounts' && (
            <AccountsView
              niche={currentNicheData}
              onOpenConnectModal={() => setIsConnectModalOpen(true)}
            />
          )}

          {currentView === 'calendar' && (
            <CalendarView
              niche={currentNicheData}
              scheduledPosts={scheduledPosts}
              onAddPost={handleSchedulePost}
              onNavigateToFactory={() => handleNavigateView('factory')}
            />
          )}

          {currentView === 'monetization' && (
            <MonetizationView niche={currentNicheData} />
          )}

          {currentView === 'settings' && (
            <SettingsView
              niche={currentNicheData}
              isTikTokConnected={isTikTokConnected}
              onOpenConnectModal={() => setIsConnectModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* 4. Modals */}
      <ViralIdeasModal
        isOpen={isViralIdeasModalOpen}
        onClose={() => setIsViralIdeasModalOpen(false)}
        niche={currentNicheData}
        ideas={viralIdeas}
        onSelectIdeaForFactory={handleSelectIdeaForFactory}
      />

      <ConnectTikTokModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        isConnected={isTikTokConnected}
        onConnectionChange={(connected) => setIsTikTokConnected(connected)}
      />

      <CustomNicheModal
        isOpen={isCustomNicheModalOpen}
        onClose={() => setIsCustomNicheModalOpen(false)}
        onAddCustomNiche={handleAddCustomNiche}
      />

      <FirebaseModal />
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <TikvoDashboard />
    </FirebaseProvider>
  );
}
