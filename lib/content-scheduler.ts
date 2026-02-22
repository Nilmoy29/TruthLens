import { Logger } from './error-handler'
import {
  sendDailyRecommendations,
  checkWellnessGoals,
  cleanupInactiveSessions,
  getUserPreferences
} from './content-monitoring'
import { createServerClient } from '@supabase/ssr'

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

// Get all active users who have content preferences
export async function getActiveUsers(): Promise<string[]> {
  try {
    const supabase = createSupabaseClient()
    
    const { data, error } = await supabase
      .from('content_preferences')
      .select('user_id')
      .eq('notifications_enabled', true)

    if (error) {
      Logger.error('Failed to fetch active users', {
        error: error.message
      })
      return []
    }

    return data.map(item => item.user_id)
  } catch (error) {
    Logger.error('Error fetching active users', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return []
  }
}

// Send daily recommendations to all active users
export async function scheduleDailyRecommendations(): Promise<void> {
  try {
    Logger.info('Starting daily recommendations job')
    
    const activeUsers = await getActiveUsers()
    
    for (const userId of activeUsers) {
      try {
        await sendDailyRecommendations(userId)
        // Add small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        Logger.error('Failed to send daily recommendations', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId
        })
      }
    }
    
    Logger.info('Daily recommendations job completed', {
      usersProcessed: activeUsers.length
    })
  } catch (error) {
    Logger.error('Daily recommendations job failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Check wellness goals for all active users
export async function scheduleWellnessGoalCheck(): Promise<void> {
  try {
    Logger.info('Starting wellness goal check job')
    
    const activeUsers = await getActiveUsers()
    
    for (const userId of activeUsers) {
      try {
        await checkWellnessGoals(userId)
        // Add small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        Logger.error('Failed to check wellness goals', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId
        })
      }
    }
    
    Logger.info('Wellness goal check job completed', {
      usersProcessed: activeUsers.length
    })
  } catch (error) {
    Logger.error('Wellness goal check job failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Cleanup inactive sessions
export async function scheduleSessionCleanup(): Promise<void> {
  try {
    Logger.info('Starting session cleanup job')
    
    cleanupInactiveSessions(30) // 30 minutes of inactivity
    
    Logger.info('Session cleanup job completed')
  } catch (error) {
    Logger.error('Session cleanup job failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Generate daily content recommendations for all users
export async function generateDailyRecommendations(): Promise<void> {
  try {
    Logger.info('Starting daily content generation job')
    
    const supabase = createSupabaseClient()
    const today = new Date().toISOString().split('T')[0]
    const activeUsers = await getActiveUsers()
    
    for (const userId of activeUsers) {
      try {
        const preferences = await getUserPreferences(userId)
        if (!preferences) {
          continue
        }

        // Check if recommendations already exist for today
        const { data: existing } = await supabase
          .from('content_calendar')
          .select('id')
          .eq('user_id', userId)
          .eq('date', today)
          .single()

        if (existing) {
          continue // Skip if already generated
        }

        // Generate recommendations based on user preferences
        const recommendations = await generateUserRecommendations(userId, preferences)
        
        // Insert into content_calendar
        const { error } = await supabase
          .from('content_calendar')
          .insert({
            user_id: userId,
            date: today,
            recommendations,
            goals: {
              daily_time_limit: preferences.daily_time_limit_minutes,
              daily_article_limit: preferences.daily_article_limit,
              daily_video_limit: preferences.daily_video_limit,
              daily_social_limit: preferences.daily_social_limit,
              min_credibility_score: preferences.min_credibility_score,
              max_bias_score: preferences.max_bias_score
            },
            created_at: new Date().toISOString()
          })

        if (error) {
          Logger.error('Failed to insert daily recommendations', {
            error: error.message,
            userId,
            date: today
          })
        }
        
        // Add small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        Logger.error('Failed to generate recommendations for user', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId
        })
      }
    }
    
    Logger.info('Daily content generation job completed', {
      usersProcessed: activeUsers.length
    })
  } catch (error) {
    Logger.error('Daily content generation job failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Generate personalized recommendations for a user
async function generateUserRecommendations(userId: string, preferences: any): Promise<any[]> {
  const recommendations = []
  
  // Generate article recommendations
  for (let i = 0; i < Math.min(preferences.daily_article_limit, 5); i++) {
    recommendations.push({
      id: `article_${i + 1}`,
      type: 'article',
      title: `Recommended Article ${i + 1}`,
      description: 'High-quality, fact-checked article tailored to your interests',
      url: '#',
      source: 'TruthLens Curated',
      credibility_score: Math.max(preferences.min_credibility_score, 0.8),
      bias_score: Math.min(preferences.max_bias_score, 0.3),
      estimated_read_time: Math.floor(Math.random() * 10) + 5, // 5-15 minutes
      categories: preferences.content_categories?.slice(0, 2) || ['news', 'technology'],
      priority: i < 2 ? 'high' : 'medium'
    })
  }
  
  // Generate video recommendations
  for (let i = 0; i < Math.min(preferences.daily_video_limit, 3); i++) {
    recommendations.push({
      id: `video_${i + 1}`,
      type: 'video',
      title: `Educational Video ${i + 1}`,
      description: 'Informative video content from trusted sources',
      url: '#',
      source: 'TruthLens Curated',
      credibility_score: Math.max(preferences.min_credibility_score, 0.8),
      bias_score: Math.min(preferences.max_bias_score, 0.3),
      estimated_watch_time: Math.floor(Math.random() * 20) + 10, // 10-30 minutes
      categories: preferences.content_categories?.slice(0, 2) || ['education', 'science'],
      priority: i === 0 ? 'high' : 'medium'
    })
  }
  
  // Add wellness content if user has wellness goals
  if (preferences.wellness_goals?.length > 0) {
    recommendations.push({
      id: 'wellness_tip',
      type: 'article',
      title: 'Daily Wellness Tip',
      description: 'Tips for maintaining healthy information consumption habits',
      url: '#',
      source: 'TruthLens Wellness',
      credibility_score: 0.95,
      bias_score: 0.1,
      estimated_read_time: 3,
      categories: ['wellness', 'mindfulness'],
      priority: 'high',
      is_wellness_content: true
    })
  }
  
  return recommendations
}

// Main scheduler function that can be called by cron jobs or API endpoints
export async function runScheduledTasks(taskType?: 'daily' | 'hourly' | 'cleanup'): Promise<void> {
  const currentHour = new Date().getHours()
  
  try {
    switch (taskType) {
      case 'daily':
        // Run daily tasks (typically at 8 AM)
        if (currentHour === 8) {
          await generateDailyRecommendations()
          await scheduleDailyRecommendations()
        }
        break
        
      case 'hourly':
        // Run hourly tasks
        await scheduleWellnessGoalCheck()
        break
        
      case 'cleanup':
        // Run cleanup tasks (every 30 minutes)
        await scheduleSessionCleanup()
        break
        
      default:
        // Auto-determine based on time
        if (currentHour === 8) {
          await generateDailyRecommendations()
          await scheduleDailyRecommendations()
        }
        
        // Run wellness checks every hour during active hours (8 AM - 10 PM)
        if (currentHour >= 8 && currentHour <= 22) {
          await scheduleWellnessGoalCheck()
        }
        
        // Run cleanup every time
        await scheduleSessionCleanup()
        break
    }
  } catch (error) {
    Logger.error('Scheduled task execution failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskType,
      currentHour
    })
  }
}

// Initialize scheduler (can be called on app startup)
export function initializeScheduler(): void {
  Logger.info('Content scheduler initialized')
  
  // Run cleanup every 30 minutes
  setInterval(() => {
    runScheduledTasks('cleanup')
  }, 30 * 60 * 1000)
  
  // Run hourly tasks every hour
  setInterval(() => {
    runScheduledTasks('hourly')
  }, 60 * 60 * 1000)
  
  // Run daily tasks check every hour (will only execute at 8 AM)
  setInterval(() => {
    runScheduledTasks('daily')
  }, 60 * 60 * 1000)
  
  Logger.info('Content scheduler intervals set up')
}