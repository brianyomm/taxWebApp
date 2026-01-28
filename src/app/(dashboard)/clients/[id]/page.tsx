'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useClient, useDeleteClient } from '@/hooks/use-clients';
import { useClientDocuments } from '@/hooks/use-documents';
import { useClientTasks } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientDialog } from '@/components/clients/client-dialog';
import { UploadDialog } from '@/components/documents/upload-dialog';
import { DocumentList } from '@/components/documents/document-list';
import { TaskList } from '@/components/tasks/task-list';
import { TaskDialog } from '@/components/tasks/task-dialog';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CheckSquare,
  User,
  Upload,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import type { Client, Task } from '@/types/database';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-800',
};

const filingStatusLabels: Record<string, string> = {
  single: 'Single',
  married_joint: 'Married Filing Jointly',
  married_separate: 'Married Filing Separately',
  head_of_household: 'Head of Household',
  widow: 'Qualifying Widow(er)',
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const { data, isLoading, error } = useClient(clientId);
  const { data: documentsData } = useClientDocuments(clientId);
  const { data: tasksData } = useClientTasks(clientId);
  const deleteClient = useDeleteClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const client = data?.data;
  const hasDocuments = (documentsData?.data?.length ?? 0) > 0;
  const hasTasks = (tasksData?.data?.length ?? 0) > 0;

  const handleDelete = async () => {
    if (!client) return;
    if (confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`)) {
      try {
        await deleteClient.mutateAsync(client.id);
        router.push('/clients');
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete client');
      }
    }
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-1" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {error?.message || 'Client not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
              <Badge className={statusColors[client.status]} variant="secondary">
                {client.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">Tax Year {client.tax_year}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Client Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="hover:underline">
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${client.phone}`} className="hover:underline">
                  {client.phone}
                </a>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{client.address}</span>
              </div>
            )}
            {client.filing_status && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{filingStatusLabels[client.filing_status]}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Created {new Date(client.created_at).toLocaleDateString()}</span>
            </div>
            {client.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Documents and Tasks */}
        <div className="md:col-span-2">
          <Tabs defaultValue="documents">
            <TabsList>
              <TabsTrigger value="documents">
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <CheckSquare className="mr-2 h-4 w-4" />
                Tasks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>
                      Tax documents uploaded for this client
                    </CardDescription>
                  </div>
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </CardHeader>
                <CardContent>
                  {hasDocuments ? (
                    <DocumentList clientId={clientId} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No documents uploaded yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setUploadDialogOpen(true)}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Documents
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>
                      Tasks related to this client
                    </CardDescription>
                  </div>
                  <Button onClick={handleNewTask}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Button>
                </CardHeader>
                <CardContent>
                  {hasTasks ? (
                    <TaskList clientId={clientId} onEdit={handleEditTask} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks created yet</p>
                      <Button variant="outline" className="mt-4" onClick={handleNewTask}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Task
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <ClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={client}
      />

      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        clientId={clientId}
        clientName={client.name}
      />

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        clientId={clientId}
      />
    </div>
  );
}
