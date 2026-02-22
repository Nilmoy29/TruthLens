import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Logger } from './error-handler'

export interface CreateNotificationData {
  userId: string
  type: 'analysis_complete' | 'subscription_update' | 'system_alert' | 'usage_warning' | 'content_reminder' | 'content_alert' | 'wellness_goal'
  title: string
  message: string
  data?: Record<string, any>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  expiresAt?: Date
}

export interface NotificationTemplate {
  title: string
  message: string
  type: CreateNotificationData['type']
  priority?: CreateNotificationData['priority']
}

// Notification templates
export const NOTIFICATION_TEMPLATES = {
  FACT_CHECK_COMPLETE: {
    title: 'Fact Check Complete',
    message: 'Your fact check analysis is ready to view.',
    type: 'analysis_complete' as const,
    priority: 'normal' as const,
  },
  BIAS_ANALYSIS_COMPLETE: {
    title: 'Bias Analysis Complete',
    message: 'Your bias analysis is ready to view.',
    type: 'analysis_complete' as const,
    priority: 'normal' as const,
  },
  MEDIA_VERIFICATION_COMPLETE: {
    title: 'Media Verification Complete',
    message: 'Your media verification analysis is ready to view.',
    type: 'analysis_complete' as const,
    priority: 'normal' as const,
  },
  SUBSCRIPTION_UPGRADED: {
    title: 'Subscription Upgraded',
    message: 'Your subscription has been successfully upgraded.',
    type: 'subscription_update' as const,
    priority: 'normal' as const,
  },
  SUBSCRIPTION_CANCELLED: {
    title: 'Subscription Cancelled',
    message: 'Your subscription has been cancelled. You can continue using your current plan until the end of the billing period.',
    type: 'subscription_update' as const,
    priority: 'normal' as const,
  },
  USAGE_LIMIT_WARNING: {
    title: 'Usage Limit Warning',
    message: 'You are approaching your monthly usage limit. Consider upgrading your plan.',
    type: 'usage_warning' as const,
    priority: 'high' as const,
  },
  USAGE_LIMIT_EXCEEDED: {
    title: 'Usage Limit Exceeded',
    message: 'You have exceeded your monthly usage limit. Please upgrade your plan to continue using our services.',
    type: 'usage_warning' as const,
    priority: 'urgent' as const,
  },
  SYSTEM_MAINTENANCE: {
    title: 'System Maintenance',
    message: 'Scheduled maintenance will occur tonight from 2-4 AM UTC. Some services may be temporarily unavailable.',
    type: 'system_alert' as const,
    priority: 'normal' as const,
  },
  SECURITY_ALERT: {
    title: 'Security Alert',
    message: 'We detected unusual activity on your account. Please review your recent activity and update your password if necessary.',
    type: 'system_alert' as const,
    priority: 'urgent' as const,
  },
  // Content Calendar Notifications
  DAILY_CONTENT_RECOMMENDATIONS: {
    title: 'Daily Content Recommendations Ready',
    message: 'Your personalized content recommendations for today are available.',
    type: 'content_reminder' as const,
    priority: 'normal' as const,
  },
  CONTENT_LIMIT_WARNING: {
    title: 'Content Consumption Warning',
    message: 'You are approaching your daily content consumption limit.',
    type: 'content_alert' as const,
    priority: 'normal' as const,
  },
  CONTENT_LIMIT_EXCEEDED: {
    title: 'Daily Content Limit Exceeded',
    message: 'You have exceeded your daily content consumption limit. Consider taking a break.',
    type: 'content_alert' as const,
    priority: 'high' as const,
  },
  BREAK_REMINDER: {
    title: 'Time for a Break',
    message: 'You have been consuming content for a while. Consider taking a short break.',
    type: 'content_reminder' as const,
    priority: 'normal' as const,
  },
  LOW_QUALITY_CONTENT_ALERT: {
    title: 'Content Quality Alert',
    message: 'Recent content may not meet your quality preferences. Review your consumption.',
    type: 'content_alert' as const,
    priority: 'normal' as const,
  },
  WELLNESS_GOAL_ACHIEVED: {
    title: 'Wellness Goal Achieved',
    message: 'Congratulations! You have achieved one of your wellness goals.',
    type: 'wellness_goal' as const,
    priority: 'normal' as const,
  },
  WELLNESS_GOAL_REMINDER: {
    title: 'Wellness Goal Reminder',
    message: 'Remember to focus on your wellness goals while consuming content today.',
    type: 'wellness_goal' as const,
    priority: 'low' as const,
  },
} as const

// Create Supabase client for server-side operations
function createSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() {
          return undefined
        },
        set() {},
        remove() {},
      },
    }
  )
}

// Create a notification
export async function createNotification(data: CreateNotificationData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseClient()
    
    const notificationData = {
      user_id: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || {},
      priority: data.priority || 'normal',
      expires_at: data.expiresAt?.toISOString() || null,
    }

    const { error } = await supabase
      .from('notifications')
      .insert([notificationData])

    if (error) {
      Logger.error('Failed to create notification', {
        error: error.message,
        userId: data.userId,
        type: data.type,
      })
      return { success: false, error: error.message }
    }

    Logger.info('Notification created successfully', {
      userId: data.userId,
      type: data.type,
      title: data.title,
    })

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    Logger.error('Failed to create notification', {
      error: errorMessage,
      userId: data.userId,
      type: data.type,
    })
    return { success: false, error: errorMessage }
  }
}

// Create notification from template
export async function createNotificationFromTemplate(
  userId: string,
  template: NotificationTemplate,
  data?: Record<string, any>,
  expiresAt?: Date
): Promise<{ success: boolean; error?: string }> {
  return createNotification({
    userId,
    type: template.type,
    title: template.title,
    message: template.message,
    data,
    priority: template.priority,
    expiresAt,
  })
}

// Create bulk notifications for multiple users
export async function createBulkNotifications(
  userIds: string[],
  template: NotificationTemplate,
  data?: Record<string, any>,
  expiresAt?: Date
): Promise<{ success: boolean; successCount: number; errors: string[] }> {
  const results = await Promise.allSettled(
    userIds.map(userId => 
      createNotificationFromTemplate(userId, template, data, expiresAt)
    )
  )

  const successCount = results.filter(result => 
    result.status === 'fulfilled' && result.value.success
  ).length

  const errors = results
    .filter(result => result.status === 'rejected' || 
      (result.status === 'fulfilled' && !result.value.success)
    )
    .map(result => 
      result.status === 'rejected' 
        ? result.reason?.message || 'Unknown error'
        : (result as PromiseFulfilledResult<{ success: boolean; error?: string }>).value.error || 'Unknown error'
    )

  Logger.info('Bulk notifications created', {
    totalUsers: userIds.length,
    successCount,
    errorCount: errors.length,
  })

  return {
    success: successCount > 0,
    successCount,
    errors,
  }
}

// Clean up expired notifications
export async function cleanupExpiredNotifications(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const supabase = createSupabaseClient()
    
    const { error } = await supabase.rpc('delete_expired_notifications')

    if (error) {
      Logger.error('Failed to cleanup expired notifications', {
        error: error.message,
      })
      return { success: false, error: error.message }
    }

    Logger.info('Expired notifications cleaned up successfully')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    Logger.error('Failed to cleanup expired notifications', {
      error: errorMessage,
    })
    return { success: false, error: errorMessage }
  }
}

// Helper function to notify user about analysis completion
export async function notifyAnalysisComplete(
  userId: string,
  analysisType: 'fact_check' | 'bias_analysis' | 'media_verification',
  analysisId: string
): Promise<{ success: boolean; error?: string }> {
  const templates = {
    fact_check: NOTIFICATION_TEMPLATES.FACT_CHECK_COMPLETE,
    bias_analysis: NOTIFICATION_TEMPLATES.BIAS_ANALYSIS_COMPLETE,
    media_verification: NOTIFICATION_TEMPLATES.MEDIA_VERIFICATION_COMPLETE,
  }

  const template = templates[analysisType]
  
  return createNotificationFromTemplate(
    userId,
    template,
    { analysisId, analysisType }
  )
}

// Helper function to notify about usage limits
export async function notifyUsageLimit(
  userId: string,
  isExceeded: boolean,
  currentUsage: number,
  limit: number
): Promise<{ success: boolean; error?: string }> {
  const template = isExceeded 
    ? NOTIFICATION_TEMPLATES.USAGE_LIMIT_EXCEEDED
    : NOTIFICATION_TEMPLATES.USAGE_LIMIT_WARNING

  return createNotificationFromTemplate(
    userId,
    template,
    { currentUsage, limit, percentage: Math.round((currentUsage / limit) * 100) }
  )
}

// Content Calendar Notification Helpers

// Notify about daily content recommendations
export async function notifyDailyRecommendations(
  userId: string,
  recommendationCount: number
): Promise<{ success: boolean; error?: string }> {
  return createNotificationFromTemplate(
    userId,
    NOTIFICATION_TEMPLATES.DAILY_CONTENT_RECOMMENDATIONS,
    { recommendationCount, date: new Date().toISOString().split('T')[0] }
  )
}

// Notify about content consumption limits
export async function notifyContentLimit(
  userId: string,
  limitType: 'time' | 'articles' | 'videos' | 'social',
  currentValue: number,
  limit: number,
  isExceeded: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const template = isExceeded
    ? NOTIFICATION_TEMPLATES.CONTENT_LIMIT_EXCEEDED
    : NOTIFICATION_TEMPLATES.CONTENT_LIMIT_WARNING

  const percentage = Math.round((currentValue / limit) * 100)
  const message = isExceeded
    ? `You have exceeded your daily ${limitType} limit (${currentValue}/${limit}).`
    : `You are approaching your daily ${limitType} limit (${currentValue}/${limit} - ${percentage}%).`

  return createNotificationFromTemplate(
    userId,
    { ...template, message },
    { limitType, currentValue, limit, percentage, isExceeded }
  )
}

// Notify about break reminders
export async function notifyBreakReminder(
  userId: string,
  sessionDuration: number,
  breakInterval: number
): Promise<{ success: boolean; error?: string }> {
  const message = `You have been consuming content for ${Math.round(sessionDuration)} minutes. Consider taking a ${Math.round(breakInterval)} minute break.`
  
  return createNotificationFromTemplate(
    userId,
    { ...NOTIFICATION_TEMPLATES.BREAK_REMINDER, message },
    { sessionDuration, breakInterval, timestamp: new Date().toISOString() }
  )
}

// Notify about low quality content
export async function notifyLowQualityContent(
  userId: string,
  averageCredibility: number,
  averageBias: number,
  contentCount: number
): Promise<{ success: boolean; error?: string }> {
  const message = `Recent content quality is below your preferences. Average credibility: ${Math.round(averageCredibility * 100)}%, Average bias: ${Math.round(averageBias * 100)}%.`
  
  return createNotificationFromTemplate(
    userId,
    { ...NOTIFICATION_TEMPLATES.LOW_QUALITY_CONTENT_ALERT, message },
    { averageCredibility, averageBias, contentCount, timestamp: new Date().toISOString() }
  )
}

// Notify about wellness goals
export async function notifyWellnessGoal(
  userId: string,
  goalType: string,
  isAchieved: boolean = false,
  progress?: number
): Promise<{ success: boolean; error?: string }> {
  const template = isAchieved
    ? NOTIFICATION_TEMPLATES.WELLNESS_GOAL_ACHIEVED
    : NOTIFICATION_TEMPLATES.WELLNESS_GOAL_REMINDER

  const message = isAchieved
    ? `Congratulations! You have achieved your ${goalType.replace('_', ' ')} goal.`
    : `Remember to focus on your ${goalType.replace('_', ' ')} goal while consuming content today.`

  return createNotificationFromTemplate(
    userId,
    { ...template, message },
    { goalType, isAchieved, progress, timestamp: new Date().toISOString() }
  )
}