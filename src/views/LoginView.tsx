import React from 'react';
import { Sparkles } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';

export const LoginView: React.FC = () => {
  const { signInWithGoogle, authLoading, authError, clearAuthError, isFirebaseConfigured } = useFirebase();

  return (
    <div className="min-h-screen bg-[#08080D] text-[#F1F1F6] flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#00FFC6]/15 border border-[#00FFC6]/30 flex items-center justify-center">
          <Sparkles size={26} className="text-[#00FFC6]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">tikvo</h1>
          <p className="text-sm text-gray-400 mt-2">
            Ton usine à vidéos virales : choisis tes niches, ta durée, et reçois 3 vidéos par jour.
          </p>
        </div>

        {!isFirebaseConfigured && (
          <p className="text-xs text-amber-300">Configuration Firebase manquante : connexion indisponible.</p>
        )}

        {authError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex justify-between gap-3">
            <span>{authError}</span>
            <button onClick={clearAuthError} className="font-bold text-red-300 hover:text-white">OK</button>
          </div>
        )}

        <button
          onClick={() => signInWithGoogle()}
          disabled={authLoading || !isFirebaseConfigured}
          className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-100 disabled:opacity-50 transition-all"
        >
          {authLoading ? 'Connexion…' : 'Se connecter avec Google'}
        </button>
      </div>
    </div>
  );
};
