'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskList } from '@/components/tasks/task-list';
import { TaskDialog } from '@/components/tasks/task-dialog';
import type { Task } from '@/types/database';

export default function TasksPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const handleNewTask = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track your team&apos;s tasks
          </p>
        </div>
        <Button onClick={handleNewTask}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Tasks</CardTitle>
              <CardDescription>
                View all tasks across all statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskList status="all" onEdit={handleEditTask} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Tasks</CardTitle>
              <CardDescription>
                Tasks waiting to be started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskList status="pending" onEdit={handleEditTask} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in_progress">
          <Card>
            <CardHeader>
              <CardTitle>In Progress</CardTitle>
              <CardDescription>
                Tasks currently being worked on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskList status="in_progress" onEdit={handleEditTask} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>In Review</CardTitle>
              <CardDescription>
                Tasks awaiting review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskList status="review" onEdit={handleEditTask} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
              <CardDescription>
                Tasks that have been finished
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskList status="completed" onEdit={handleEditTask} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
      />
    </div>
  );
}
