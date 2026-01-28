'use client';

import { useUserSync } from '@/hooks/use-user-sync';
import { Skeleton } from '@/components/ui/skeleton';

interface UserSyncGuardProps {
  children: React.ReactNode;
}

export function UserSyncGuard({ children }: UserSyncGuardProps) {
  const { synced, loading, error } = useUserSync();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-medium">Failed to set up your account</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!synced) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
