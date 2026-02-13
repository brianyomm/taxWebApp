-- Align document status values with application workflow and add reviewer notes.

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_status_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_status_check
  CHECK (status IN (
    'pending_upload',
    'pending_ocr',
    'processing',
    'pending_review',
    'verified',
    'rejected',
    'error'
  ));

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS notes TEXT;
