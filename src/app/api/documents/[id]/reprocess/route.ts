import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';
import { uuidSchema } from '@/lib/validation/api';

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

    // Get document and verify ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', idResult.data)
      .eq('organization_id', user.organization_id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update status to pending_ocr
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'pending_ocr' })
      .eq('id', idResult.data)
      .eq('organization_id', user.organization_id);
    if (updateError) {
      return NextResponse.json({ error: 'Failed to queue document for processing' }, { status: 500 });
    }

    // Trigger reprocessing via Inngest
    await inngest.send({
      name: 'document/reprocess',
      data: {
        documentId: document.id,
        organizationId: user.organization_id,
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
