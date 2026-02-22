import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, withDatabaseErrorHandling, RequestContext } from '@/lib/api-middleware';
import { AppError, ErrorType } from '@/lib/error-handler';

async function getUsers(request: NextRequest, context: RequestContext) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  const offset = (page - 1) * limit;

  const result = await withDatabaseErrorHandling(
    () => {
      let query = context.supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (role) {
        query = query.eq('role', role);
      }

      if (status) {
        query = query.eq('status', status);
      }

      return query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);
    },
    'fetch users'
  );

  const users = (result as any).data || [];
  const count = (result as any).count || 0;
  const totalPages = Math.ceil(count / limit);

  return NextResponse.json({
    data: users,
    pagination: {
      page,
      limit,
      totalCount: count,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    filters: {
      search,
      role,
      status,
      sortBy,
      sortOrder
    }
  });
}

export const GET = withAdmin(getUsers);

async function updateUser(request: NextRequest, context: RequestContext) {
  const { userId, updates } = await request.json();

  if (!userId) {
     throw new AppError('Missing userId', ErrorType.VALIDATION, 400);
   }

  // Validate updates
  const allowedFields = ['role', 'status', 'subscription_tier'];
  const validUpdates: any = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      validUpdates[key] = value;
    }
  }

  if (Object.keys(validUpdates).length === 0) {
     throw new AppError('No valid fields to update', ErrorType.VALIDATION, 400);
   }

  // Prevent admin from demoting themselves
  if (userId === context.session.user.id && validUpdates.role && validUpdates.role !== 'admin') {
     throw new AppError('Cannot change your own admin role', ErrorType.VALIDATION, 400);
   }

  const updatedUser = await withDatabaseErrorHandling(
    () => context.supabase
      .from('profiles')
      .update({
        ...validUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single(),
    'update user'
  );

  return NextResponse.json({ user: (updatedUser as any).data });
}

export const PUT = withAdmin(updateUser);

async function deleteUser(request: NextRequest, context: RequestContext) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
     throw new AppError('Missing userId parameter', ErrorType.VALIDATION, 400);
   }

  // Prevent admin from deleting themselves
  if (userId === context.session.user.id) {
     throw new AppError('Cannot delete your own account', ErrorType.VALIDATION, 400);
   }

  await withDatabaseErrorHandling(
    () => context.supabase
      .from('profiles')
      .delete()
      .eq('id', userId),
    'delete user'
  );

  return NextResponse.json({ 
    message: 'User deleted successfully',
    deletedUserId: userId
  });
}

export const DELETE = withAdmin(deleteUser);