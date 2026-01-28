'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateClient, useUpdateClient } from '@/hooks/use-clients';
import { useUsers } from '@/hooks/use-users';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Client, CreateClientInput } from '@/types/database';

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

const filingStatusOptions = [
  { value: 'single', label: 'Single' },
  { value: 'married_joint', label: 'Married Filing Jointly' },
  { value: 'married_separate', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'widow', label: 'Qualifying Widow(er)' },
];

export function ClientDialog({ open, onOpenChange, client }: ClientDialogProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const { data: usersData } = useUsers();
  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      tax_year: new Date().getFullYear(),
      filing_status: undefined,
      assigned_to: undefined,
      notes: '',
    },
  });

  // Reset form when dialog opens/closes or client changes
  useEffect(() => {
    if (open && client) {
      reset({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        tax_year: client.tax_year,
        filing_status: client.filing_status,
        assigned_to: client.assigned_to || undefined,
        notes: client.notes || '',
      });
    } else if (open) {
      reset({
        name: '',
        email: '',
        phone: '',
        address: '',
        tax_year: new Date().getFullYear(),
        filing_status: undefined,
        assigned_to: undefined,
        notes: '',
      });
    }
  }, [open, client, reset]);

  const onSubmit = async (data: CreateClientInput) => {
    try {
      if (isEditing && client) {
        await updateClient.mutateAsync({ id: client.id, ...data });
      } else {
        await createClient.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const filingStatus = watch('filing_status');
  const assignedTo = watch('assigned_to');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the client information below.'
                : 'Enter the client details to add them to your organization.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="123 Main St, City, State ZIP"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tax_year">Tax Year</Label>
                <Input
                  id="tax_year"
                  type="number"
                  {...register('tax_year', { valueAsNumber: true })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="filing_status">Filing Status</Label>
                <Select
                  value={filingStatus || ''}
                  onValueChange={(value) => setValue('filing_status', value as Client['filing_status'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {filingStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assigned_to">Assigned CPA</Label>
              <Select
                value={assignedTo || '_unassigned'}
                onValueChange={(value) => setValue('assigned_to', value === '_unassigned' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_unassigned">Unassigned</SelectItem>
                  {usersData?.data?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Any additional notes about this client..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
