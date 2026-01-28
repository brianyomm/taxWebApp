'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useDocumentUrl, useUpdateDocument, useReprocessDocument } from '@/hooks/use-documents';
import type { Document } from '@/types/database';

interface DocumentViewerProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_ocr: {
    label: 'Pending OCR',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="h-3 w-3" />,
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800',
    icon: <RefreshCw className="h-3 w-3 animate-spin" />,
  },
  pending_review: {
    label: 'Pending Review',
    color: 'bg-orange-100 text-orange-800',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  verified: {
    label: 'Verified',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  error: {
    label: 'Error',
    color: 'bg-red-100 text-red-800',
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

const CATEGORIES = [
  { value: 'income', label: 'Income' },
  { value: 'deductions', label: 'Deductions' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'banking', label: 'Banking' },
  { value: 'property', label: 'Property' },
  { value: 'identity', label: 'Identity' },
  { value: 'other', label: 'Other' },
];

const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  income: [
    { value: 'W-2', label: 'W-2' },
    { value: '1099-INT', label: '1099-INT' },
    { value: '1099-DIV', label: '1099-DIV' },
    { value: '1099-B', label: '1099-B' },
    { value: '1099-MISC', label: '1099-MISC' },
    { value: '1099-NEC', label: '1099-NEC' },
    { value: '1099-R', label: '1099-R' },
    { value: 'K-1', label: 'K-1' },
    { value: 'SSA-1099', label: 'SSA-1099' },
  ],
  deductions: [
    { value: '1098', label: '1098 (Mortgage)' },
    { value: '1098-T', label: '1098-T (Tuition)' },
    { value: '1098-E', label: '1098-E (Student Loan)' },
    { value: 'Medical receipts', label: 'Medical Receipts' },
    { value: 'Charitable donations', label: 'Charitable Donations' },
    { value: 'Property tax', label: 'Property Tax' },
  ],
  expenses: [
    { value: 'Business receipts', label: 'Business Receipts' },
    { value: 'Home office', label: 'Home Office' },
    { value: 'Vehicle logs', label: 'Vehicle Logs' },
    { value: 'Travel expenses', label: 'Travel Expenses' },
    { value: 'Equipment', label: 'Equipment' },
  ],
  banking: [
    { value: 'Bank statement', label: 'Bank Statement' },
    { value: 'Investment statement', label: 'Investment Statement' },
    { value: 'Brokerage statement', label: 'Brokerage Statement' },
  ],
  property: [
    { value: 'Property tax bill', label: 'Property Tax Bill' },
    { value: 'Purchase documents', label: 'Purchase Documents' },
    { value: 'Sale documents', label: 'Sale Documents' },
    { value: 'Closing statement', label: 'Closing Statement' },
  ],
  identity: [
    { value: 'Drivers license', label: "Driver's License" },
    { value: 'Prior year return', label: 'Prior Year Return' },
    { value: 'Social security card', label: 'Social Security Card' },
  ],
  other: [
    { value: 'Miscellaneous', label: 'Miscellaneous' },
    { value: 'Unclassified', label: 'Unclassified' },
  ],
};

export function DocumentViewer({ document, open, onOpenChange }: DocumentViewerProps) {
  const [selectedCategory, setSelectedCategory] = useState(document?.category || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(document?.subcategory || '');

  const { data: urlData, isLoading: urlLoading } = useDocumentUrl(document?.id || null);
  const updateDocument = useUpdateDocument();
  const reprocessDocument = useReprocessDocument();

  if (!document) return null;

  const status = statusConfig[document.status] || statusConfig.pending_review;
  const extractedData = document.extracted_data as Record<string, unknown> | null;
  const classification = extractedData?.classification as Record<string, unknown> | null;

  // Handle both array format and flat object format for extracted fields
  const rawExtractedFields = extractedData?.extractedFields || classification?.extractedFields;
  const extractedFields: Array<{ fieldName: string; value: string; confidence: number }> | null =
    rawExtractedFields
      ? Array.isArray(rawExtractedFields)
        ? rawExtractedFields as Array<{ fieldName: string; value: string; confidence: number }>
        : // Convert flat object to array format
          Object.entries(rawExtractedFields as Record<string, unknown>)
            .filter(([key]) => key !== 'confidence' && key !== 'error' && key !== 'rawText')
            .map(([key, value]) => ({
              fieldName: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              value: String(value),
              confidence: (rawExtractedFields as Record<string, unknown>).confidence as number || 0,
            }))
      : null;

  const handleVerify = async () => {
    try {
      const updates: Partial<Document> & { id: string } = {
        id: document.id,
        status: 'verified',
      };

      const category = selectedCategory || document.category;
      const subcategory = selectedSubcategory || document.subcategory;

      if (category) {
        // @ts-expect-error - category string from select needs to be cast
        updates.category = category;
      }
      if (subcategory) {
        // @ts-expect-error - subcategory string from select needs to be cast
        updates.subcategory = subcategory;
      }

      await updateDocument.mutateAsync(updates);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to verify document:', error);
    }
  };

  const handleReprocess = async () => {
    try {
      await reprocessDocument.mutateAsync(document.id);
    } catch (error) {
      console.error('Failed to reprocess document:', error);
    }
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedSubcategory('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {document.file_name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge className={status.color} variant="secondary">
                  {status.icon}
                  <span className="ml-1">{status.label}</span>
                </Badge>
                {document.category && (
                  <Badge variant="outline">
                    {document.category}
                    {document.subcategory && ` / ${document.subcategory}`}
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
            <TabsTrigger value="ocr">OCR Text</TabsTrigger>
            <TabsTrigger value="classify">Classification</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                {urlLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : urlData?.url ? (
                  <div className="h-full flex flex-col">
                    <div className="flex justify-end gap-2 p-2 border-b">
                      <Button variant="outline" size="sm" asChild>
                        <a href={urlData.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={urlData.url} download={document.file_name}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                    {document.mime_type?.startsWith('image/') ? (
                      <div className="flex-1 flex items-center justify-center p-4 bg-muted/50">
                        <img
                          src={urlData.url}
                          alt={document.file_name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : document.mime_type === 'application/pdf' ? (
                      <iframe
                        src={urlData.url}
                        className="flex-1 w-full"
                        title={document.file_name}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Preview not available for this file type
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Failed to load document
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extracted" className="flex-1 overflow-hidden">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Extracted Fields</CardTitle>
                <CardDescription>
                  Data extracted from the document by AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100%-100px)]">
                  {extractedFields && extractedFields.length > 0 ? (
                    <div className="space-y-3">
                      {extractedFields.map((field, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="text-sm font-medium">{field.fieldName}</p>
                            <p className="text-sm text-muted-foreground">{field.value}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(field.confidence)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No extracted data available
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ocr" className="flex-1 overflow-hidden">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>OCR Text</CardTitle>
                <CardDescription>
                  Raw text extracted from the document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100%-100px)]">
                  {document.ocr_text ? (
                    <pre className="text-sm whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-lg">
                      {document.ocr_text}
                    </pre>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No OCR text available
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classify" className="flex-1 overflow-hidden">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Document Classification</CardTitle>
                <CardDescription>
                  Review and adjust the document classification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {classification && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">AI Classification:</span>{' '}
                      {classification.category as string} / {classification.subcategory as string}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Confidence:</span>{' '}
                      {classification.confidence as number}%
                    </p>
                    {classification.summary ? (
                      <p className="text-sm">
                        <span className="font-medium">Summary:</span>{' '}
                        {String(classification.summary)}
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={selectedCategory || document.category || ''}
                      onValueChange={handleCategoryChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subcategory</label>
                    <Select
                      value={selectedSubcategory || document.subcategory || ''}
                      onValueChange={setSelectedSubcategory}
                      disabled={!selectedCategory && !document.category}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBCATEGORIES[selectedCategory || document.category || '']?.map((sub) => (
                          <SelectItem key={sub.value} value={sub.value}>
                            {sub.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={handleReprocess}
            disabled={reprocessDocument.isPending || document.status === 'processing'}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${reprocessDocument.isPending ? 'animate-spin' : ''}`} />
            Reprocess
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {document.status !== 'verified' && (
              <Button
                onClick={handleVerify}
                disabled={updateDocument.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify & Approve
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
