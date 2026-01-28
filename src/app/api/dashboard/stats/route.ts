import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const orgId = user.organization_id;

    // Get counts in parallel
    const [
      clientsResult,
      documentsResult,
      tasksInProgressResult,
      tasksDueSoonResult,
      recentActivityResult,
      pendingTasksResult,
    ] = await Promise.all([
      // Total active clients
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active'),

      // Documents pending review
      supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'pending_review'),

      // Tasks in progress
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'in_progress'),

      // Tasks due within 7 days
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .neq('status', 'completed')
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),

      // Recent activity (last 10 audit logs)
      supabase
        .from('audit_logs')
        .select('*, user:users(name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Pending tasks (limit 5)
      supabase
        .from('tasks')
        .select('*, client:clients(name)')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5),
    ]);

    return NextResponse.json({
      data: {
        totalClients: clientsResult.count || 0,
        documentsPendingReview: documentsResult.count || 0,
        tasksInProgress: tasksInProgressResult.count || 0,
        tasksDueSoon: tasksDueSoonResult.count || 0,
        recentActivity: recentActivityResult.data || [],
        pendingTasks: pendingTasksResult.data || [],
      },
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
