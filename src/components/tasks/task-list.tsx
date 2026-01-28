'use client';

import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/use-tasks';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Task } from '@/types/database';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

interface TaskListProps {
  status?: string;
  clientId?: string;
  onEdit?: (task: Task) => void;
}

export function TaskList({ status, clientId, onEdit }: TaskListProps) {
  const { data, isLoading, error } = useTasks({
    status: status !== 'all' ? status : undefined,
    client_id: clientId,
  });
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleToggleComplete = async (task: Task) => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        status: task.status === 'completed' ? 'pending' : 'completed',
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update task');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteTask.mutateAsync(id);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete task');
      }
    }
  };

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading tasks: {error.message}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Task</TableHead>
            {!clientId && <TableHead>Client</TableHead>}
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                {!clientId && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              </TableRow>
            ))
          ) : data?.data && data.data.length > 0 ? (
            data.data.map((task) => (
              <TableRow key={task.id} className={task.status === 'completed' ? 'opacity-60' : ''}>
                <TableCell>
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => handleToggleComplete(task)}
                  />
                </TableCell>
                <TableCell>
                  <div className={task.status === 'completed' ? 'line-through' : ''}>
                    <span className="font-medium">{task.title}</span>
                    {task.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                        {task.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                {!clientId && (
                  <TableCell>
                    {(task as Task & { client?: { id: string; name: string } }).client ? (
                      <Link
                        href={`/clients/${(task as Task & { client?: { id: string; name: string } }).client?.id}`}
                        className="hover:underline"
                      >
                        {(task as Task & { client?: { name: string } }).client?.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Badge className={priorityColors[task.priority]} variant="secondary">
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[task.status]} variant="secondary">
                    {task.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(task)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(task.id, task.title)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={clientId ? 6 : 7} className="text-center py-8 text-muted-foreground">
                No tasks found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
