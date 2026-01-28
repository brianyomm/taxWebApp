'use client';

import { useState } from 'react';
import { useDocuments, useDeleteDocument } from '@/hooks/use-documents';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Trash2, Eye, FileText, RefreshCw } from 'lucide-react';
import { DocumentViewer } from './document-viewer';
import type { Document } from '@/types/database';

const statusColors: Record<string, string> = {
  pending_upload: 'bg-gray-100 text-gray-800',
  pending_ocr: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  pending_review: 'bg-orange-100 text-orange-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  error: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pending_upload: 'Pending Upload',
  pending_ocr: 'Pending OCR',
  processing: 'Processing',
  pending_review: 'Needs Review',
  verified: 'Verified',
  rejected: 'Rejected',
  error: 'Error',
};

const categoryLabels: Record<string, string> = {
  income: 'Income',
  deductions: 'Deductions',
  expenses: 'Expenses',
  banking: 'Banking',
  property: 'Property',
  identity: 'Identity',
  other: 'Other',
};

interface DocumentListProps {
  clientId?: string;
  status?: string;
}

export function DocumentList({ clientId, status }: DocumentListProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data, isLoading, error } = useDocuments({
    ...(clientId && { client_id: clientId }),
    ...(status && status !== 'all' && { status }),
  });
  const deleteDocument = useDeleteDocument();

  const handleView = (doc: Document) => {
    setSelectedDocument(doc);
    setViewerOpen(true);
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      try {
        await deleteDocument.mutateAsync(id);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete document');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading documents: {error.message}
      </div>
    );
  }

  return (
    <>
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            {!clientId && <TableHead>Client</TableHead>}
            <TableHead>Category</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                {!clientId && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              </TableRow>
            ))
          ) : data?.data && data.data.length > 0 ? (
            data.data.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate max-w-[200px]">
                      {doc.file_name}
                    </span>
                  </div>
                </TableCell>
                {!clientId && (
                  <TableCell>
                    {(doc as Document & { client?: { name: string } }).client?.name || '-'}
                  </TableCell>
                )}
                <TableCell>
                  {doc.category ? (
                    <Badge variant="outline">
                      {categoryLabels[doc.category] || doc.category}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatFileSize(doc.file_size)}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[doc.status]} variant="secondary">
                    {statusLabels[doc.status] || doc.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(doc.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(doc)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View & Review
                      </DropdownMenuItem>
                      {doc.status === 'pending_review' && (
                        <DropdownMenuItem onClick={() => handleView(doc)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Verify Document
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(doc.id, doc.file_name)}
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
                No documents found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>

    <DocumentViewer
      document={selectedDocument}
      open={viewerOpen}
      onOpenChange={setViewerOpen}
    />
    </>
  );
}
