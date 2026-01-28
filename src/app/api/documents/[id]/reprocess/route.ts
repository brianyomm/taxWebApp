import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/documents/[id]/reprocess - Trigger reprocessing of a document
export async function POST(
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

    // Get document and verify ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update status to pending_ocr
    await supabase
      .from('documents')
      .update({ status: 'pending_ocr' })
      .eq('id', id);

    // Trigger reprocessing via Inngest
    await inngest.send({
      name: 'document/uploaded',
      data: {
        documentId: document.id,
        organizationId: user.organization_id,
        fileUrl: document.file_url,
        fileName: document.file_name,
        mimeType: document.mime_type,
      },
    });

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'reprocess',
      resource_type: 'document',
      resource_id: document.id,
      details: { file_name: document.file_name },
    });

    return NextResponse.json({
      data: { message: 'Document queued for reprocessing' },
    });
  } catch (error) {
    console.error('Error in POST /api/documents/[id]/reprocess:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
