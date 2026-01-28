'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, CreateTaskInput, ApiResponse, PaginatedResponse } from '@/types/database';

interface TasksQueryParams {
  client_id?: string;
  status?: string;
  assigned_to?: string;
  limit?: number;
  offset?: number;
}

// Fetch tasks
async function fetchTasks(params: TasksQueryParams = {}): Promise<PaginatedResponse<Task>> {
  const searchParams = new URLSearchParams();
  if (params.client_id) searchParams.set('client_id', params.client_id);
  if (params.status) searchParams.set('status', params.status);
  if (params.assigned_to) searchParams.set('assigned_to', params.assigned_to);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const response = await fetch(`/api/tasks?${searchParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch tasks');
  }
  return response.json();
}

// Create task
async function createTask(data: CreateTaskInput): Promise<ApiResponse<Task>> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create task');
  }
  return response.json();
}

// Update task
async function updateTask({ id, ...data }: Partial<Task> & { id: string }): Promise<ApiResponse<Task>> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update task');
  }
  return response.json();
}

// Delete task
async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete task');
  }
}

// Hooks
export function useTasks(params: TasksQueryParams = {}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => fetchTasks(params),
  });
}

export function useClientTasks(clientId: string) {
  return useTasks({ client_id: clientId });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
