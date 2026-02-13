import { Inngest } from 'inngest';

// Create the Inngest client
export const inngest = new Inngest({
  id: 'taxbinder',
  name: 'TaxBinder',
});

// Event types
export type DocumentUploadedEvent = {
  name: 'document/uploaded';
  data: {
    documentId: string;
    organizationId: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
  };
};

export type DocumentProcessedEvent = {
  name: 'document/processed';
  data: {
    documentId: string;
    organizationId: string;
    success: boolean;
    error?: string;
  };
};

export type DocumentReprocessEvent = {
  name: 'document/reprocess';
  data: {
    documentId: string;
    organizationId: string;
  };
};

export type DocumentsBulkProcessEvent = {
  name: 'documents/bulk-process';
  data: {
    documentIds: string[];
    organizationId: string;
  };
};

export type Events = {
  'document/uploaded': DocumentUploadedEvent;
  'document/processed': DocumentProcessedEvent;
  'document/reprocess': DocumentReprocessEvent;
  'documents/bulk-process': DocumentsBulkProcessEvent;
};
