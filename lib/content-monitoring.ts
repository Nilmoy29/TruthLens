import { createServerClient } from '@supabase/ssr'
import { Logger } from './error-handler'
import {
  notifyDailyRecommendations,
  notifyContentLimit,
  notifyBreakReminder,
  notifyLowQualityContent,
  notifyWellnessGoal
} from './notifications'

interface ContentSession {
  userId: string
  startTime: Date
  lastActivity: Date
  contentCount: number
  totalTime: number
  averageCredibility: number
  averageBias: number
}

interface UserPreferences {
  daily_time_limit_minutes: number
  daily_article_limit: number
  daily_video_limit: number
  daily_social_limit: number
  min_credibility_score: number
  max_bias_score: number
  break_reminders_enabled: boolean
  break_interval_minutes: number
  wellness_goals: string[]
}

// In-memory session tracking (in production, use Redis or similar)
const activeSessions = new Map<string, ContentSession>()

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

// Get user preferences from database
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const supabase = createSupabaseClient()
    
    const { data, error } = await supabase
      .from('content_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      Logger.error('Failed to fetch user preferences', {
        error: error.message,
        userId
      })
      return null
    }

    return data
  } catch (error) {
    Logger.error('Error fetching user preferences', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId
    })
    return null
  }
}

// Get today's content consumption stats
export async function getTodayConsumption(userId: string): Promise<{
  timeSpent: number
  articleCount: number
  videoCount: number
  socialCount: number
  averageCredibility: number
  averageBias: number
} | null> {
  try {
    const supabase = createSupabaseClient()
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('content_consumption_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('consumed_at', `${today}T00:00:00.000Z`)
      .lt('consumed_at', `${today}T23:59:59.999Z`)

    if (error) {
      Logger.error('Failed to fetch consumption data', {
        error: error.message,
        userId,
        date: today
      })
      return null
    }

    if (!data || data.length === 0) {
      return {
        timeSpent: 0,
        articleCount: 0,
        videoCount: 0,
        socialCount: 0,
        averageCredibility: 0,
        averageBias: 0
      }
    }

    const timeSpent = data.reduce((sum, item) => sum + (item.time_spent || 0), 0)
    const articleCount = data.filter(item => item.content_type === 'article').length
    const videoCount = data.filter(item => item.content_type === 'video').length
    const socialCount = data.filter(item => item.content_type === 'social').length
    
    const credibilityScores = data.filter(item => item.credibility_score !== null).map(item => item.credibility_score)
    const biasScores = data.filter(item => item.bias_score !== null).map(item => item.bias_score)
    
    const averageCredibility = credibilityScores.length > 0 
      ? credibilityScores.reduce((sum, score) => sum + score, 0) / credibilityScores.length 
      : 0
    
    const averageBias = biasScores.length > 0 
      ? biasScores.reduce((sum, score) => sum + score, 0) / biasScores.length 
      : 0

    return {
      timeSpent,
      articleCount,
      videoCount,
      socialCount,
      averageCredibility,
      averageBias
    }
  } catch (error) {
    Logger.error('Error fetching consumption data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId
    })
    return null
  }
}

// Start a content consumption session
export async function startContentSession(userId: string): Promise<void> {
  const session: ContentSession = {
    userId,
    startTime: new Date(),
    lastActivity: new Date(),
    contentCount: 0,
    totalTime: 0,
    averageCredibility: 0,
    averageBias: 0
  }
  
  activeSessions.set(userId, session)
  
  Logger.info('Content session started', {
    userId,
    startTime: session.startTime.toISOString()
  })
}

// Update content session with new activity
export async function updateContentSession(
  userId: string,
  contentType: 'article' | 'video' | 'social',
  timeSpent: number,
  credibilityScore?: number,
  biasScore?: number
): Promise<void> {
  const session = activeSessions.get(userId)
  if (!session) {
    // Start a new session if none exists
    await startContentSession(userId)
    return updateContentSession(userId, contentType, timeSpent, credibilityScore, biasScore)
  }

  // Update session data
  session.lastActivity = new Date()
  session.contentCount += 1
  session.totalTime += timeSpent
  
  // Update quality scores
  if (credibilityScore !== undefined) {
    session.averageCredibility = (session.averageCredibility * (session.contentCount - 1) + credibilityScore) / session.contentCount
  }
  
  if (biasScore !== undefined) {
    session.averageBias = (session.averageBias * (session.contentCount - 1) + biasScore) / session.contentCount
  }

  activeSessions.set(userId, session)
  
  // Check for notifications
  await checkContentLimits(userId, contentType)
  await checkBreakReminders(userId)
  await checkContentQuality(userId)
  
  Logger.info('Content session updated', {
    userId,
    contentType,
    timeSpent,
    totalTime: session.totalTime,
    contentCount: session.contentCount
  })
}

// End a content consumption session
export async function endContentSession(userId: string): Promise<void> {
  const session = activeSessions.get(userId)
  if (!session) {
    return
  }

  activeSessions.delete(userId)
  
  Logger.info('Content session ended', {
    userId,
    duration: Date.now() - session.startTime.getTime(),
    contentCount: session.contentCount,
    totalTime: session.totalTime
  })
}

// Check if user is approaching or exceeding content limits
export async function checkContentLimits(
  userId: string,
  contentType: 'article' | 'video' | 'social'
): Promise<void> {
  const preferences = await getUserPreferences(userId)
  const consumption = await getTodayConsumption(userId)
  
  if (!preferences || !consumption) {
    return
  }

  // Check time limit
  const timePercentage = (consumption.timeSpent / preferences.daily_time_limit_minutes) * 100
  if (timePercentage >= 100) {
    await notifyContentLimit(userId, 'time', consumption.timeSpent, preferences.daily_time_limit_minutes, true)
  } else if (timePercentage >= 80) {
    await notifyContentLimit(userId, 'time', consumption.timeSpent, preferences.daily_time_limit_minutes, false)
  }

  // Check content type limits
  const limits = {
    article: { current: consumption.articleCount, limit: preferences.daily_article_limit },
    video: { current: consumption.videoCount, limit: preferences.daily_video_limit },
    social: { current: consumption.socialCount, limit: preferences.daily_social_limit }
  }

  for (const [type, data] of Object.entries(limits)) {
    const percentage = (data.current / data.limit) * 100
    if (percentage >= 100) {
      await notifyContentLimit(userId, type as any, data.current, data.limit, true)
    } else if (percentage >= 80) {
      await notifyContentLimit(userId, type as any, data.current, data.limit, false)
    }
  }
}

// Check if user needs a break reminder
export async function checkBreakReminders(userId: string): Promise<void> {
  const preferences = await getUserPreferences(userId)
  const session = activeSessions.get(userId)
  
  if (!preferences || !session || !preferences.break_reminders_enabled) {
    return
  }

  const sessionDuration = (Date.now() - session.startTime.getTime()) / (1000 * 60) // minutes
  const breakInterval = preferences.break_interval_minutes
  
  // Check if it's time for a break (allow 1 minute tolerance)
  if (sessionDuration >= breakInterval && sessionDuration % breakInterval < 1) {
    await notifyBreakReminder(userId, sessionDuration, breakInterval)
  }
}

// Check content quality and notify if below preferences
export async function checkContentQuality(userId: string): Promise<void> {
  const preferences = await getUserPreferences(userId)
  const consumption = await getTodayConsumption(userId)
  
  if (!preferences || !consumption) {
    return
  }

  // Only check if user has consumed at least 3 pieces of content
  const totalContent = consumption.articleCount + consumption.videoCount + consumption.socialCount
  if (totalContent < 3) {
    return
  }

  // Check if content quality is below preferences
  const credibilityBelowThreshold = consumption.averageCredibility < preferences.min_credibility_score
  const biasAboveThreshold = consumption.averageBias > preferences.max_bias_score
  
  if (credibilityBelowThreshold || biasAboveThreshold) {
    await notifyLowQualityContent(
      userId,
      consumption.averageCredibility,
      consumption.averageBias,
      totalContent
    )
  }
}

// Send daily content recommendations notification
export async function sendDailyRecommendations(userId: string): Promise<void> {
  try {
    const supabase = createSupabaseClient()
    const today = new Date().toISOString().split('T')[0]
    
    // Get today's recommendations count
    const { data, error } = await supabase
      .from('content_calendar')
      .select('recommendations')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (error) {
      Logger.error('Failed to fetch recommendations', {
        error: error.message,
        userId,
        date: today
      })
      return
    }

    const recommendationCount = data?.recommendations?.length || 0
    
    if (recommendationCount > 0) {
      await notifyDailyRecommendations(userId, recommendationCount)
    }
  } catch (error) {
    Logger.error('Error sending daily recommendations', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId
    })
  }
}

// Check and notify about wellness goals
export async function checkWellnessGoals(userId: string): Promise<void> {
  const preferences = await getUserPreferences(userId)
  const consumption = await getTodayConsumption(userId)
  
  if (!preferences || !consumption || !preferences.wellness_goals.length) {
    return
  }

  for (const goal of preferences.wellness_goals) {
    let isAchieved = false
    let progress = 0

    switch (goal) {
      case 'reduce_misinformation':
        isAchieved = consumption.averageCredibility >= preferences.min_credibility_score
        progress = consumption.averageCredibility
        break
      case 'balanced_perspective':
        isAchieved = consumption.averageBias <= preferences.max_bias_score
        progress = 1 - consumption.averageBias
        break
      case 'time_management':
        isAchieved = consumption.timeSpent <= preferences.daily_time_limit_minutes
        progress = Math.max(0, 1 - (consumption.timeSpent / preferences.daily_time_limit_minutes))
        break
      default:
        continue
    }

    if (isAchieved) {
      await notifyWellnessGoal(userId, goal, true, progress)
    }
  }
}

// Cleanup inactive sessions (call this periodically)
export function cleanupInactiveSessions(maxInactiveMinutes: number = 30): void {
  const now = Date.now()
  const maxInactiveMs = maxInactiveMinutes * 60 * 1000
  
  for (const [userId, session] of activeSessions.entries()) {
    const inactiveTime = now - session.lastActivity.getTime()
    if (inactiveTime > maxInactiveMs) {
      activeSessions.delete(userId)
      Logger.info('Cleaned up inactive session', {
        userId,
        inactiveMinutes: Math.round(inactiveTime / (60 * 1000))
      })
    }
  }
}