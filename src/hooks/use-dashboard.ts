'use client';

import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  totalClients: number;
  documentsPendingReview: number;
  tasksInProgress: number;
  tasksDueSoon: number;
  recentActivity: Array<{
    id: string;
    action: string;
    resource_type: string;
    details: Record<string, unknown>;
    created_at: string;
    user?: { name: string };
  }>;
  pendingTasks: Array<{
    id: string;
    title: string;
    due_date: string | null;
    priority: string;
    client?: { name: string };
  }>;
}

async function fetchDashboardStats(): Promise<{ data: DashboardStats }> {
  const response = await fetch('/api/dashboard/stats');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch dashboard stats');
  }
  return response.json();
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
