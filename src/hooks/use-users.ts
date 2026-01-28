'use client';

import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UsersResponse {
  data: User[];
}

async function fetchUsers(): Promise<UsersResponse> {
  const response = await fetch('/api/users');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }
  return response.json();
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}

export function useTeamMembers() {
  return useUsers();
}
