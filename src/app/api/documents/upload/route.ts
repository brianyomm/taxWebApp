import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';
import {
  documentCategorySchema,
  sanitizeFileName,
  uuidSchema,
  validateUploadFile,
} from '@/lib/validation/api';

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

    const fileValidation = validateUploadFile(file);
    if (!fileValidation.success) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 });
    }

    const clientIdResult = uuidSchema.safeParse(clientId);
    if (!clientIdResult.success) {
      return NextResponse.json({ error: 'Invalid client_id' }, { status: 400 });
    }

    if (category) {
      const categoryResult = documentCategorySchema.safeParse(category);
      if (!categoryResult.success) {
        return NextResponse.json({ error: 'Invalid document category' }, { status: 400 });
      }
    }

    const normalizedSubcategory = subcategory?.trim() || null;
    if (normalizedSubcategory && normalizedSubcategory.length > 50) {
      return NextResponse.json({ error: 'Subcategory must be 50 characters or fewer' }, { status: 400 });
    }

    let normalizedTaxYear: number | null = null;
    if (taxYear) {
      const parsedTaxYear = Number.parseInt(taxYear, 10);
      if (!Number.isInteger(parsedTaxYear) || parsedTaxYear < 2000 || parsedTaxYear > 2100) {
        return NextResponse.json({ error: 'Invalid tax year' }, { status: 400 });
      }
      normalizedTaxYear = parsedTaxYear;
    }

    // Verify client belongs to organization
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientIdResult.data)
      .eq('organization_id', user.organization_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const safeFileName = sanitizeFileName(file.name);
    const filePath = `${user.organization_id}/${clientIdResult.data}/${timestamp}-${safeFileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
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
        client_id: clientIdResult.data,
        organization_id: user.organization_id,
        file_url: filePath,
        file_name: safeFileName,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        category: category || null,
        subcategory: normalizedSubcategory,
        tax_year: normalizedTaxYear || new Date().getFullYear(),
        status: 'pending_ocr',
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
      details: { file_name: safeFileName, client_id: clientIdResult.data, file_size: file.size },
    });

    // Trigger document processing via Inngest
    try {
      await inngest.send({
        name: 'document/uploaded',
        data: {
          documentId: document.id,
          organizationId: user.organization_id,
          fileUrl: filePath,
          fileName: safeFileName,
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
