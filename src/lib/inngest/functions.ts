import { inngest } from './client';
import { createClient } from '@supabase/supabase-js';
import { analyzeDocument, isOCRConfigured } from '../ocr/azure-document';
import { classifyDocument, extractTaxFormData, isAIConfigured } from '../ai/classifier';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Process uploaded document - OCR and classification
export const processDocument = inngest.createFunction(
  {
    id: 'process-document',
    name: 'Process Uploaded Document',
    retries: 3,
  },
  { event: 'document/uploaded' },
  async ({ event, step }) => {
    const { documentId, organizationId, fileUrl, fileName } = event.data;

    // Step 1: Update document status to processing
    await step.run('update-status-processing', async () => {
      await supabase
        .from('documents')
        .update({ status: 'processing' })
        .eq('id', documentId);
    });

    // Step 2: Run OCR
    let ocrResult = null;
    let ocrError: string | null = null;
    if (isOCRConfigured()) {
      try {
        ocrResult = await step.run('run-ocr', async () => {
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(fileUrl, 3600);

          if (signedUrlError || !signedUrlData?.signedUrl) {
            throw new Error('Failed to get signed URL for document');
          }

          return analyzeDocument(signedUrlData.signedUrl);
        });
      } catch (error) {
        ocrError = error instanceof Error ? error.message : 'OCR failed';
      }
    }

    // Step 3: Run AI classification
    let classificationResult = null;
    let classificationError: string | null = null;
    if (isAIConfigured() && ocrResult?.text) {
      try {
        classificationResult = await step.run('classify-document', async () => {
          return classifyDocument(ocrResult.text);
        });
      } catch (error) {
        classificationError = error instanceof Error ? error.message : 'Classification failed';
      }
    }

    // Step 4: Extract detailed data if we have a specific form type
    let extractedData = null;
    if (isAIConfigured() && ocrResult?.text && classificationResult?.subcategory) {
      extractedData = await step.run('extract-form-data', async () => {
        try {
          const formTypes = ['W-2', '1099-INT', '1099-DIV', '1098', '1099-MISC', '1099-NEC', 'K-1'];
          if (formTypes.includes(classificationResult.subcategory)) {
            return await extractTaxFormData(ocrResult.text, classificationResult.subcategory);
          }
          return classificationResult.extractedFields;
        } catch (error) {
          console.error('Data extraction failed:', error);
          return classificationResult.extractedFields;
        }
      });
    }

    const processingErrors: string[] = [];
    if (isOCRConfigured() && !ocrResult) {
      processingErrors.push(ocrError || 'OCR processing failed');
    }
    if (isAIConfigured() && ocrResult?.text && !classificationResult) {
      processingErrors.push(classificationError || 'Document classification failed');
    }

    // Step 5: Update document with results
    await step.run('update-document', async () => {
      const updateData: Record<string, unknown> = {
        status: processingErrors.length > 0 ? 'error' : 'pending_review',
        updated_at: new Date().toISOString(),
      };

      if (ocrResult) {
        updateData.ocr_text = ocrResult.text;
      }

      if (classificationResult) {
        updateData.category = classificationResult.category;
        updateData.subcategory = classificationResult.subcategory;
        if (classificationResult.taxYear) {
          updateData.tax_year = classificationResult.taxYear;
        }
      }

      if (extractedData || classificationResult?.extractedFields) {
        updateData.extracted_data = {
          classification: classificationResult,
          extractedFields: extractedData || classificationResult?.extractedFields,
          ocrMetadata: ocrResult ? {
            pageCount: ocrResult.pages.length,
            tableCount: ocrResult.tables.length,
            keyValuePairCount: ocrResult.keyValuePairs.length,
          } : null,
          processedAt: new Date().toISOString(),
        };
      }
      if (processingErrors.length > 0) {
        updateData.extracted_data = {
          ...((updateData.extracted_data as Record<string, unknown>) || {}),
          processingErrors,
          failedAt: new Date().toISOString(),
        };
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) {
        throw error;
      }

      return updateData;
    });

    // Step 6: Create audit log
    await step.run('create-audit-log', async () => {
      await supabase.from('audit_logs').insert({
        organization_id: organizationId,
        action: 'process',
        resource_type: 'document',
        resource_id: documentId,
        details: {
          fileName,
          category: classificationResult?.category,
          subcategory: classificationResult?.subcategory,
          confidence: classificationResult?.confidence,
          ocrSuccess: !!ocrResult,
          classificationSuccess: !!classificationResult,
          processingErrors,
        },
      });
    });

    return {
      success: processingErrors.length === 0,
      documentId,
      category: classificationResult?.category,
      subcategory: classificationResult?.subcategory,
      confidence: classificationResult?.confidence,
      ocrPageCount: ocrResult?.pages.length || 0,
      errors: processingErrors,
    };
  }
);

// Reprocess a document (e.g., after manual correction)
export const reprocessDocument = inngest.createFunction(
  {
    id: 'reprocess-document',
    name: 'Reprocess Document',
    retries: 2,
  },
  { event: 'document/reprocess' },
  async ({ event, step }) => {
    const { documentId, organizationId } = event.data;

    // Get document details
    const document = await step.run('get-document', async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw new Error('Document not found');
      }

      return data;
    });

    // Trigger the main processing flow
    await step.sendEvent('trigger-reprocess', {
      name: 'document/uploaded',
      data: {
        documentId,
        organizationId,
        fileUrl: document.file_url,
        fileName: document.file_name,
        mimeType: document.mime_type,
      },
    });

    return { success: true, documentId };
  }
);

// Bulk process documents
export const bulkProcessDocuments = inngest.createFunction(
  {
    id: 'bulk-process-documents',
    name: 'Bulk Process Documents',
    retries: 1,
  },
  { event: 'documents/bulk-process' },
  async ({ event, step }) => {
    const { documentIds, organizationId } = event.data;

    // Get all documents
    const documents = await step.run('get-documents', async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .in('id', documentIds)
        .eq('organization_id', organizationId);

      if (error) {
        throw error;
      }

      return data || [];
    });

    // Send events for each document
    await step.sendEvent(
      'trigger-bulk-processing',
      documents.map((doc) => ({
        name: 'document/uploaded' as const,
        data: {
          documentId: doc.id,
          organizationId,
          fileUrl: doc.file_url,
          fileName: doc.file_name,
          mimeType: doc.mime_type,
        },
      }))
    );

    return {
      success: true,
      documentsQueued: documents.length,
    };
  }
);

// All functions for export
export const functions = [processDocument, reprocessDocument, bulkProcessDocuments];
