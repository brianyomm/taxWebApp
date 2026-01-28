import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/auth/sync - Sync Clerk user with Supabase
// Called on first login to ensure user and organization exist
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already exists in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('clerk_id', userId)
      .single();

    if (existingUser) {
      // User already synced
      return NextResponse.json({
        data: existingUser,
        message: 'User already synced',
      });
    }

    // Create a new organization for this user
    const orgName = user.firstName
      ? `${user.firstName}'s Organization`
      : 'My Organization';

    const orgSlug = `org-${userId.slice(0, 8).toLowerCase()}`;

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug: orgSlug,
        subscription_tier: 'free',
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    // Create the user record
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_id: userId,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
        role: 'admin', // First user is always admin
        organization_id: organization.id,
        avatar_url: user.imageUrl,
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      // Rollback organization creation
      await supabase.from('organizations').delete().eq('id', organization.id);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      organization_id: organization.id,
      user_id: newUser.id,
      action: 'create',
      resource_type: 'organization',
      resource_id: organization.id,
      details: { name: orgName, source: 'signup' },
    });

    return NextResponse.json({
      data: {
        user: newUser,
        organization,
      },
      message: 'User and organization created',
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/auth/sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/auth/sync - Check if user is synced
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*, organization:organizations(*)')
      .eq('clerk_id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ synced: false });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('clerk_id', userId);

    return NextResponse.json({
      synced: true,
      data: user,
    });
  } catch (error) {
    console.error('Error in GET /api/auth/sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
