import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { updateDocumentSchema, uuidSchema } from '@/lib/validation/api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/documents/[id] - Get a single document
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
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid document id' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: document, error } = await supabase
      .from('documents')
      .select('*, client:clients(id, name), uploaded_by_user:users!documents_uploaded_by_fkey(id, name)')
      .eq('id', idResult.data)
      .eq('organization_id', user.organization_id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ data: document });
  } catch (error) {
    console.error('Error in GET /api/documents/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/documents/[id] - Update a document
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
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid document id' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify document belongs to organization
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('id', idResult.data)
      .eq('organization_id', user.organization_id)
      .single();

    if (!existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsedBody = updateDocumentSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message || 'Invalid request body' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = Object.fromEntries(
      Object.entries(parsedBody.data).filter(([, value]) => value !== undefined)
    );

    const { data: document, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', idResult.data)
      .eq('organization_id', user.organization_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'update',
      resource_type: 'document',
      resource_id: idResult.data,
      details: updateData,
    });

    return NextResponse.json({ data: document });
  } catch (error) {
    console.error('Error in PUT /api/documents/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/documents/[id] - Delete a document
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
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid document id' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get document to verify ownership and get file_url for cleanup
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_url, file_name')
      .eq('id', idResult.data)
      .eq('organization_id', user.organization_id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from storage
    if (document.file_url) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_url]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete document record
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', idResult.data)
      .eq('organization_id', user.organization_id);

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'delete',
      resource_type: 'document',
      resource_id: idResult.data,
      details: { file_name: document.file_name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/documents/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
