import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  createTaskSchema,
  parsePagination,
  taskStatusSchema,
  uuidSchema,
} from '@/lib/validation/api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tasks - List all tasks
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');
    const paginationResult = parsePagination(searchParams);
    if (!paginationResult.success) {
      return NextResponse.json({ error: paginationResult.error.issues[0]?.message || 'Invalid pagination values' }, { status: 400 });
    }
    const { limit, offset } = paginationResult.data;

    let query = supabase
      .from('tasks')
      .select('*, client:clients(id, name), assigned_user:users!tasks_assigned_to_fkey(id, name)', { count: 'exact' })
      .eq('organization_id', user.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (clientId) {
      const clientIdResult = uuidSchema.safeParse(clientId);
      if (!clientIdResult.success) {
        return NextResponse.json({ error: 'Invalid client_id filter' }, { status: 400 });
      }
      query = query.eq('client_id', clientIdResult.data);
    }

    if (status && status !== 'all') {
      const statusResult = taskStatusSchema.safeParse(status);
      if (!statusResult.success) {
        return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
      }
      query = query.eq('status', statusResult.data);
    }

    if (assignedTo) {
      const assignedToResult = uuidSchema.safeParse(assignedTo);
      if (!assignedToResult.success) {
        return NextResponse.json({ error: 'Invalid assigned_to filter' }, { status: 400 });
      }
      query = query.eq('assigned_to', assignedToResult.data);
    }

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: tasks,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsedBody = createTaskSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message || 'Invalid request body' }, { status: 400 });
    }
    const { title, description, client_id, priority, assigned_to, due_date } = parsedBody.data;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        organization_id: user.organization_id,
        title,
        description,
        client_id,
        priority: priority || 'medium',
        assigned_to,
        due_date,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'create',
      resource_type: 'task',
      resource_id: task.id,
      details: { title },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
