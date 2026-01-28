'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Document, ApiResponse, PaginatedResponse } from '@/types/database';

interface DocumentsQueryParams {
  client_id?: string;
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

// Fetch documents
async function fetchDocuments(params: DocumentsQueryParams = {}): Promise<PaginatedResponse<Document>> {
  const searchParams = new URLSearchParams();
  if (params.client_id) searchParams.set('client_id', params.client_id);
  if (params.status) searchParams.set('status', params.status);
  if (params.category) searchParams.set('category', params.category);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const response = await fetch(`/api/documents?${searchParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch documents');
  }
  return response.json();
}

// Upload document
interface UploadDocumentParams {
  file: File;
  client_id: string;
  category?: string;
  subcategory?: string;
  tax_year?: number;
}

async function uploadDocument(params: UploadDocumentParams): Promise<ApiResponse<Document>> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('client_id', params.client_id);
  if (params.category) formData.append('category', params.category);
  if (params.subcategory) formData.append('subcategory', params.subcategory);
  if (params.tax_year) formData.append('tax_year', params.tax_year.toString());

  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload document');
  }
  return response.json();
}

// Update document
async function updateDocument({ id, ...data }: Partial<Document> & { id: string }): Promise<ApiResponse<Document>> {
  const response = await fetch(`/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update document');
  }
  return response.json();
}

// Delete document
async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete document');
  }
}

// Hooks
export function useDocuments(params: DocumentsQueryParams = {}) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => fetchDocuments(params),
  });
}

export function useClientDocuments(clientId: string) {
  return useDocuments({ client_id: clientId });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', { client_id: variables.client_id }] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
