import React from 'react';
import { FirebaseProvider, useFirebase } from './contexts/FirebaseContext';
import { useUserProfile } from './hooks/useUserProfile';
import { LoginView } from './views/LoginView';
import { OnboardingNiches } from './views/OnboardingNiches';
import { ProgramDurationView } from './views/ProgramDuration';
import { ProgramView } from './views/ProgramView';

const Shell: React.FC<{ email?: string | null; onLogout: () => void; children: React.ReactNode }> = ({
  email,
  onLogout,
  children,
}) => (
  <div className="min-h-screen bg-[#08080D] text-[#F1F1F6]">
    <header className="sticky top-0 z-10 bg-[#08080D]/90 backdrop-blur border-b border-white/5">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-sm font-black text-white">tikvo</span>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="truncate max-w-[180px]">{email}</span>
          <button type="button" onClick={onLogout} className="font-bold text-gray-300 hover:text-white">
            Se déconnecter
          </button>
        </div>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
  </div>
);

const Splash: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-screen bg-[#08080D] flex items-center justify-center">
    <p className="text-sm text-gray-400">{label}</p>
  </div>
);

function FactoryGate() {
  const { user, loading, logout } = useFirebase();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid ?? null);

  if (loading) return <Splash label="Connexion…" />;
  if (!user) return <LoginView />;
  if (profileLoading) return <Splash label="Chargement de ton espace…" />;

  const step = profile?.onboardingStep ?? null;
  const hasNiches = (profile?.niches.length ?? 0) > 0;

  let body: React.ReactNode;
  if (!profile || step === null || step === 'niches' || !hasNiches) {
    body = <OnboardingNiches uid={user.uid} initial={profile?.niches ?? []} />;
  } else if (step === 'duration') {
    body = <ProgramDurationView uid={user.uid} />;
  } else {
    // 'generating' ou 'done' : ProgramView génère puis affiche le programme.
    body = <ProgramView uid={user.uid} profile={profile} />;
  }

  return (
    <Shell email={user.email} onLogout={() => logout()}>
      {body}
    </Shell>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <FactoryGate />
    </FirebaseProvider>
  );
}
