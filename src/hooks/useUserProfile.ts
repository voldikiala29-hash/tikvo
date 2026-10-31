import { useEffect, useState } from 'react';
import { UserProfile, watchUserProfile } from '../services/factoryStore';

export function useUserProfile(uid: string | null): { profile: UserProfile | null; loading: boolean } {
  const [state, setState] = useState<{ profile: UserProfile | null; loading: boolean }>({
    profile: null,
    loading: Boolean(uid),
  });

  useEffect(() => {
    if (!uid) {
      setState({ profile: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return watchUserProfile(uid, (profile) => setState({ profile, loading: false }));
  }, [uid]);

  return state;
}
