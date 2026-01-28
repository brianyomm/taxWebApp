import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tasks/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*, client:clients(id, name), assigned_user:users!tasks_assigned_to_fkey(id, name)')
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tasks/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, client_id, status, priority, assigned_to, due_date } = body;

    // Check if task belongs to organization
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .single();

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update completed_at if status changed to completed
    const updateData: Record<string, unknown> = {
      title,
      description,
      client_id,
      status,
      priority,
      assigned_to,
      due_date,
    };

    if (status === 'completed' && existingTask.status !== 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status !== 'completed') {
      updateData.completed_at = null;
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'update',
      resource_type: 'task',
      resource_id: id,
      details: { title, status },
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Error in PUT /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .single();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('organization_id', user.organization_id);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'delete',
      resource_type: 'task',
      resource_id: id,
      details: { title: task?.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
