import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateProfileBody, withDatabaseErrorHandling, RequestContext, withValidation } from '@/lib/api-middleware';

async function getProfile(request: NextRequest, context: RequestContext) {
  const profile = await withDatabaseErrorHandling(
    () => context.supabase
      .from('profiles')
      .select('*')
      .eq('id', context.user!.id)
      .single()
      .then((result: any) => {
        if (result.error) throw result.error;
        return result.data;
      }),
    'fetch profile'
  );

  return NextResponse.json({ profile });
}

async function updateProfile(request: NextRequest, context: RequestContext) {
  validateProfileBody(context.body);

  const profile = await withDatabaseErrorHandling(
    () => context.supabase
      .from('profiles')
      .update(context.body)
      .eq('id', context.user!.id)
      .select()
      .single()
      .then((result: any) => {
        if (result.error) throw result.error;
        return result.data;
      }),
    'update profile'
  );

  return NextResponse.json({ profile });
}

async function deleteProfile(request: NextRequest, context: RequestContext) {
  // Sign out user first
  await context.supabase.auth.signOut();

  // Delete profile
  await withDatabaseErrorHandling(
    () => context.supabase
      .from('profiles')
      .delete()
      .eq('id', context.user!.id)
      .then((result: any) => {
        if (result.error) throw result.error;
        return result.data;
      }),
    'delete profile'
  );

  return NextResponse.json({ message: 'Profile deleted successfully' });
}

export const GET = withAuth(getProfile);
export const PUT = withAuth(updateProfile);
export const DELETE = withAuth(deleteProfile);