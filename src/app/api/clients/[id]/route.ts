import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/clients/[id] - Get a single client
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

    // Get the user's organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: client, error } = await supabase
      .from('clients')
      .select('*, assigned_user:users!clients_assigned_to_fkey(id, name, email)')
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .single();

    if (error) {
      console.error('Error fetching client:', error);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Error in GET /api/clients/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/clients/[id] - Update a client
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

    // Get the user's organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, email, phone, address, tax_year, filing_status, status, assigned_to, notes } = body;

    // Verify the client belongs to the user's organization
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .single();

    if (checkError || !existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update({
        name,
        email,
        phone,
        address,
        tax_year,
        filing_status,
        status,
        assigned_to,
        notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'update',
      resource_type: 'client',
      resource_id: id,
      details: { name },
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Error in PUT /api/clients/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/clients/[id] - Delete a client
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

    // Get the user's organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins can delete clients
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete clients' }, { status: 403 });
    }

    // Get client name for audit log
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .single();

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('organization_id', user.organization_id);

    if (error) {
      console.error('Error deleting client:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'delete',
      resource_type: 'client',
      resource_id: id,
      details: { name: client?.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/clients/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
