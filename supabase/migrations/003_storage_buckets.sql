-- Storage bucket setup for document uploads
-- Run this in Supabase SQL Editor

-- Create the documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload documents for their organization
CREATE POLICY "Users can upload documents to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM organizations
        WHERE id = (
            SELECT organization_id FROM users
            WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    )
);

-- Policy: Users can view documents from their organization
CREATE POLICY "Users can view documents from their org"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM organizations
        WHERE id = (
            SELECT organization_id FROM users
            WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    )
);

-- Policy: Users can delete documents from their organization
CREATE POLICY "Users can delete documents from their org"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM organizations
        WHERE id = (
            SELECT organization_id FROM users
            WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    )
);
