import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  createDocumentSchema,
  documentCategorySchema,
  documentStatusSchema,
  parsePagination,
  uuidSchema,
} from '@/lib/validation/api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/documents - List documents
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
    const category = searchParams.get('category');
    const paginationResult = parsePagination(searchParams);
    if (!paginationResult.success) {
      return NextResponse.json({ error: paginationResult.error.issues[0]?.message || 'Invalid pagination values' }, { status: 400 });
    }
    const { limit, offset } = paginationResult.data;

    let query = supabase
      .from('documents')
      .select('*, client:clients(id, name), uploaded_by_user:users!documents_uploaded_by_fkey(id, name)', { count: 'exact' })
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
      const statusResult = documentStatusSchema.safeParse(status);
      if (!statusResult.success) {
        return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
      }
      query = query.eq('status', statusResult.data);
    }

    if (category && category !== 'all') {
      const categoryResult = documentCategorySchema.safeParse(category);
      if (!categoryResult.success) {
        return NextResponse.json({ error: 'Invalid category filter' }, { status: 400 });
      }
      query = query.eq('category', categoryResult.data);
    }

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: documents,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/documents - Create document record (after file upload)
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
    const parsedBody = createDocumentSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message || 'Invalid request body' }, { status: 400 });
    }
    const {
      client_id,
      file_url,
      file_name,
      file_size,
      mime_type,
      category,
      subcategory,
      tax_year,
    } = parsedBody.data;

    // Verify client belongs to organization
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('organization_id', user.organization_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        client_id,
        organization_id: user.organization_id,
        file_url,
        file_name,
        file_size: file_size || 0,
        mime_type: mime_type || 'application/octet-stream',
        category,
        subcategory,
        tax_year: tax_year || new Date().getFullYear(),
        status: 'pending_review',
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'upload',
      resource_type: 'document',
      resource_id: document.id,
      details: { file_name, client_id },
    });

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
