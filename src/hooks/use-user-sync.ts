'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface SyncState {
  synced: boolean;
  loading: boolean;
  error: string | null;
}

export function useUserSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [syncState, setSyncState] = useState<SyncState>({
    synced: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded || !isSignedIn || !user) {
        setSyncState({ synced: false, loading: false, error: null });
        return;
      }

      try {
        // Check if user is synced
        const checkResponse = await fetch('/api/auth/sync');
        const checkData = await checkResponse.json();

        if (checkData.synced) {
          setSyncState({ synced: true, loading: false, error: null });
          return;
        }

        // User not synced, create them
        const syncResponse = await fetch('/api/auth/sync', {
          method: 'POST',
        });

        if (!syncResponse.ok) {
          const error = await syncResponse.json();
          throw new Error(error.error || 'Failed to sync user');
        }

        setSyncState({ synced: true, loading: false, error: null });
      } catch (error) {
        console.error('Error syncing user:', error);
        setSyncState({
          synced: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    syncUser();
  }, [isLoaded, isSignedIn, user]);

  return syncState;
}
