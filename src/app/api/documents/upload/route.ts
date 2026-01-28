import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/documents/upload - Upload a file to storage
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clientId = formData.get('client_id') as string;
    const category = formData.get('category') as string | null;
    const subcategory = formData.get('subcategory') as string | null;
    const taxYear = formData.get('tax_year') as string | null;

    if (!file || !clientId) {
      return NextResponse.json(
        { error: 'File and client_id are required' },
        { status: 400 }
      );
    }

    // Verify client belongs to organization
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('organization_id', user.organization_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const filePath = `${user.organization_id}/${clientId}/${timestamp}-${file.name}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Store the file path (not a signed URL) - we'll generate signed URLs on demand
    // Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        client_id: clientId,
        organization_id: user.organization_id,
        file_url: filePath, // Store the path, not a signed URL
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        category: category || null,
        subcategory: subcategory || null,
        tax_year: taxYear ? parseInt(taxYear) : new Date().getFullYear(),
        status: 'pending_ocr', // Initial status before processing
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document record:', docError);
      // Try to delete the uploaded file
      await supabase.storage.from('documents').remove([filePath]);
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'upload',
      resource_type: 'document',
      resource_id: document.id,
      details: { file_name: file.name, client_id: clientId, file_size: file.size },
    });

    // Trigger document processing via Inngest
    try {
      await inngest.send({
        name: 'document/uploaded',
        data: {
          documentId: document.id,
          organizationId: user.organization_id,
          fileUrl: filePath,
          fileName: file.name,
          mimeType: file.type,
        },
      });
    } catch (inngestError) {
      console.error('Failed to trigger document processing:', inngestError);
      // Don't fail the upload if Inngest fails - document is still uploaded
    }

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/documents/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
