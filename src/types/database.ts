// Database Types for Tax Binder Application

export type UserRole = 'admin' | 'cpa' | 'staff';
export type ClientStatus = 'active' | 'pending' | 'completed' | 'archived';
export type DocumentStatus = 'pending_upload' | 'pending_ocr' | 'processing' | 'pending_review' | 'verified' | 'rejected' | 'error';
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type DocumentCategory =
  | 'income'
  | 'deductions'
  | 'expenses'
  | 'banking'
  | 'property'
  | 'identity'
  | 'other';

export type DocumentSubcategory =
  // Income
  | 'w2' | '1099-int' | '1099-div' | '1099-b' | '1099-misc' | '1099-nec' | 'k1' | 'ssa-1099'
  // Deductions
  | '1098-mortgage' | '1098-t' | 'medical' | 'charitable'
  // Expenses
  | 'business-receipt' | 'home-office' | 'vehicle' | 'travel'
  // Banking
  | 'bank-statement' | 'investment-statement'
  // Property
  | 'property-tax' | 'property-sale'
  // Identity
  | 'drivers-license' | 'prior-return'
  // Other
  | 'miscellaneous' | 'unclassified';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  settings: OrganizationSettings;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  branding?: {
    primary_color?: string;
    logo_url?: string;
  };
  notifications?: {
    email_on_upload?: boolean;
    email_on_task_complete?: boolean;
  };
  document_categories?: string[];
}

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  role: UserRole;
  organization_id: string;
  avatar_url?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_year: number;
  filing_status?: 'single' | 'married_joint' | 'married_separate' | 'head_of_household' | 'widow';
  status: ClientStatus;
  assigned_to?: string;
  notes?: string;
  portal_access_token?: string;
  portal_access_expires?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  client_id: string;
  organization_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  category?: DocumentCategory;
  subcategory?: DocumentSubcategory;
  tax_year: number;
  ocr_text?: string;
  extracted_data?: Record<string, unknown>;
  status: DocumentStatus;
  uploaded_by: string;
  verified_by?: string;
  page_number?: number;
  total_pages?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  organization_id: string;
  client_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  resource_type: 'organization' | 'user' | 'client' | 'document' | 'task';
  resource_id: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form Types
export interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_year: number;
  filing_status?: Client['filing_status'];
  assigned_to?: string;
  notes?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  client_id?: string;
  priority: TaskPriority;
  assigned_to?: string;
  due_date?: string;
}

export interface UploadDocumentInput {
  client_id: string;
  file: File;
  tax_year: number;
  category?: DocumentCategory;
  subcategory?: DocumentSubcategory;
}
