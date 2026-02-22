import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withDatabaseErrorHandling, RequestContext } from '@/lib/api-middleware'
import { AppError, ErrorType } from '@/lib/error-handler'
import { Logger } from '@/lib/error-handler'

// Get user notifications
async function getNotifications(request: NextRequest, context: RequestContext): Promise<NextResponse> {
  const { supabase, session, requestId } = context
  const userId = session?.user?.id

  if (!userId) {
    throw new AppError('User not authenticated', ErrorType.AUTHENTICATION)
  }

  Logger.info('Fetching notifications', {
    requestId,
    userId,
    action: 'get_notifications'
  })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const unreadOnly = searchParams.get('unread_only') === 'true'
  const type = searchParams.get('type')

  const offset = (page - 1) * limit

  // Build query
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply filters
  if (unreadOnly) {
    query = query.eq('read', false)
  }

  if (type) {
    query = query.eq('type', type)
  }

  // Filter out expired notifications
  query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

  return withDatabaseErrorHandling(async () => {
    const { data: notifications, error, count } = await query

    if (error) {
      throw error
    }

    // Get unread count
    const { data: unreadCountData } = await supabase
      .rpc('get_unread_notification_count', { target_user_id: userId })

    const unreadCount = unreadCountData || 0

    Logger.info('Notifications fetched successfully', {
      requestId,
      userId,
      count: notifications?.length || 0,
      totalCount: count,
      unreadCount
    })

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      unreadCount
    })
  })
}

// Mark notifications as read
async function updateNotifications(request: NextRequest, context: RequestContext): Promise<NextResponse> {
  const { supabase, session, requestId, body } = context
  const userId = session?.user?.id

  if (!userId) {
    throw new AppError('User not authenticated', ErrorType.AUTHENTICATION)
  }

  const { notificationIds, markAllAsRead } = body

  Logger.info('Updating notifications', {
    requestId,
    userId,
    action: 'update_notifications',
    notificationIds: notificationIds?.length || 0,
    markAllAsRead
  })

  if (markAllAsRead) {
    // Mark all notifications as read
    return withDatabaseErrorHandling(async () => {
      const { error } = await supabase
        .rpc('mark_all_notifications_read', { target_user_id: userId })

      if (error) {
        throw error
      }

      Logger.info('All notifications marked as read', {
        requestId,
        userId
      })

      return NextResponse.json({ success: true })
    })
  } else if (notificationIds && Array.isArray(notificationIds)) {
    // Mark specific notifications as read
    if (notificationIds.length === 0) {
      throw new AppError('No notification IDs provided', ErrorType.VALIDATION)
    }

    return withDatabaseErrorHandling(async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .in('id', notificationIds)
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      Logger.info('Notifications marked as read', {
        requestId,
        userId,
        count: notificationIds.length
      })

      return NextResponse.json({ success: true })
    })
  } else {
    throw new AppError('Invalid request body', ErrorType.VALIDATION)
  }
}

// Delete notifications
async function deleteNotifications(request: NextRequest, context: RequestContext): Promise<NextResponse> {
  const { supabase, session, requestId, body } = context
  const userId = session?.user?.id

  if (!userId) {
    throw new AppError('User not authenticated', ErrorType.AUTHENTICATION)
  }

  const { notificationIds } = body

  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new AppError('No notification IDs provided', ErrorType.VALIDATION)
  }

  Logger.info('Deleting notifications', {
    requestId,
    userId,
    action: 'delete_notifications',
    count: notificationIds.length
  })

  return withDatabaseErrorHandling(async () => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    Logger.info('Notifications deleted successfully', {
      requestId,
      userId,
      count: notificationIds.length
    })

    return NextResponse.json({ success: true })
  })
}

// Export wrapped functions
export const GET = withAuth(getNotifications)
export const PUT = withAuth(updateNotifications)
export const DELETE = withAuth(deleteNotifications)