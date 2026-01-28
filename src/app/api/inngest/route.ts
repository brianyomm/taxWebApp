import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { functions } from '@/lib/inngest/functions';

// Ensure this route is always dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const handler = serve({
  client: inngest,
  functions,
});

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
