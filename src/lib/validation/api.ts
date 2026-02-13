import { z } from 'zod';

const MAX_PAGE_SIZE = 100;
const MAX_OFFSET = 10_000;
const MAX_SEARCH_LENGTH = 100;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export const uuidSchema = z.string().uuid();

export const allowedUploadMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/heic',
  'image/heif',
]);

export const clientStatusSchema = z.enum(['active', 'pending', 'completed', 'archived']);
export const taskStatusSchema = z.enum(['pending', 'in_progress', 'review', 'completed']);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const documentStatusSchema = z.enum([
  'pending_upload',
  'pending_ocr',
  'processing',
  'pending_review',
  'verified',
  'rejected',
  'error',
]);
export const documentCategorySchema = z.enum([
  'income',
  'deductions',
  'expenses',
  'banking',
  'property',
  'identity',
  'other',
]);
export const filingStatusSchema = z.enum([
  'single',
  'married_joint',
  'married_separate',
  'head_of_household',
  'widow',
]);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const optionalUuid = z
  .string()
  .uuid()
  .optional()
  .or(z.literal('').transform(() => undefined));

export const createClientSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: optionalTrimmed(50),
  address: optionalTrimmed(1000),
  tax_year: z.coerce.number().int().min(2000).max(2100).optional(),
  filing_status: filingStatusSchema.optional(),
  assigned_to: optionalUuid,
  notes: optionalTrimmed(5000),
});

export const updateClientSchema = createClientSchema
  .extend({
    status: clientStatusSchema.optional(),
  })
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, 'At least one field is required');

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: optionalTrimmed(5000),
  client_id: optionalUuid,
  priority: taskPrioritySchema.optional(),
  assigned_to: optionalUuid,
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const updateTaskSchema = createTaskSchema
  .extend({
    status: taskStatusSchema.optional(),
  })
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, 'At least one field is required');

export const createDocumentSchema = z.object({
  client_id: uuidSchema,
  file_url: z.string().trim().min(1).max(2000),
  file_name: z.string().trim().min(1).max(255),
  file_size: z.coerce.number().int().min(0).max(MAX_FILE_SIZE_BYTES).optional(),
  mime_type: z.string().trim().min(1).max(100).optional(),
  category: documentCategorySchema.optional(),
  subcategory: optionalTrimmed(50),
  tax_year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const updateDocumentSchema = z
  .object({
    status: documentStatusSchema.optional(),
    category: documentCategorySchema.optional(),
    subcategory: optionalTrimmed(50),
    tax_year: z.coerce.number().int().min(2000).max(2100).optional(),
    notes: optionalTrimmed(5000),
  })
  .refine((payload) => Object.keys(payload).length > 0, 'At least one field is required');

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
  offset: z.coerce.number().int().min(0).max(MAX_OFFSET).default(0),
});

export function parsePagination(searchParams: URLSearchParams) {
  return paginationSchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });
}

export function parseSearchTerm(searchTerm: string | null) {
  if (!searchTerm) {
    return { success: true as const, value: null };
  }

  const normalized = searchTerm.trim();
  if (!normalized) {
    return { success: true as const, value: null };
  }

  if (normalized.length > MAX_SEARCH_LENGTH) {
    return { success: false as const, error: `Search query must be ${MAX_SEARCH_LENGTH} characters or fewer` };
  }

  return { success: true as const, value: normalized };
}

export function escapeLikeValue(value: string) {
  return value.replace(/[\\%_(),]/g, '\\$&');
}

export function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim().slice(0, 255);
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function validateUploadFile(file: File) {
  if (!allowedUploadMimeTypes.has(file.type)) {
    return { success: false as const, error: 'Unsupported file type' };
  }

  if (file.size <= 0) {
    return { success: false as const, error: 'File is empty' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false as const, error: 'File exceeds 15MB size limit' };
  }

  return { success: true as const };
}
