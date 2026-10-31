import { useEffect, useState } from 'react';
import { UserProfile, watchUserProfile } from '../services/factoryStore';

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useUserProfile(uid: string | null): ProfileState {
  const [state, setState] = useState<ProfileState>({ profile: null, loading: Boolean(uid), error: null });

  useEffect(() => {
    if (!uid) {
      setState({ profile: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return watchUserProfile(uid, (profile, error) => setState({ profile, loading: false, error }));
  }, [uid]);

  return state;
}
