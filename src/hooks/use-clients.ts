'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Client, CreateClientInput, ApiResponse, PaginatedResponse } from '@/types/database';

interface ClientsQueryParams {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Fetch all clients
async function fetchClients(params: ClientsQueryParams = {}): Promise<PaginatedResponse<Client>> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const response = await fetch(`/api/clients?${searchParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch clients');
  }
  return response.json();
}

// Fetch a single client
async function fetchClient(id: string): Promise<ApiResponse<Client>> {
  const response = await fetch(`/api/clients/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch client');
  }
  return response.json();
}

// Create a client
async function createClient(data: CreateClientInput): Promise<ApiResponse<Client>> {
  const response = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create client');
  }
  return response.json();
}

// Update a client
async function updateClient({ id, ...data }: Partial<Client> & { id: string }): Promise<ApiResponse<Client>> {
  const response = await fetch(`/api/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update client');
  }
  return response.json();
}

// Delete a client
async function deleteClient(id: string): Promise<void> {
  const response = await fetch(`/api/clients/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete client');
  }
}

// Hooks
export function useClients(params: ClientsQueryParams = {}) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => fetchClients(params),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => fetchClient(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateClient,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
