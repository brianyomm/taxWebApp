'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentList } from '@/components/documents/document-list';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            View and manage all uploaded tax documents
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="pending_review">Needs Review</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>
                All uploaded documents across all clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending_review">
          <Card>
            <CardHeader>
              <CardTitle>Needs Review</CardTitle>
              <CardDescription>
                Documents that need manual verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verified">
          <Card>
            <CardHeader>
              <CardTitle>Verified</CardTitle>
              <CardDescription>
                Documents that have been verified
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
