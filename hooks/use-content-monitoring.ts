import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'

interface ContentSession {
  isActive: boolean
  startTime: Date | null
  totalTime: number
  contentCount: number
}

interface TodayStats {
  total_time: number
  total_content: number
  articles: number
  videos: number
  social: number
  average_credibility: number
  average_bias: number
  recent_content: Array<{
    type: string
    title: string | null
    url: string | null
    time_spent: number
    credibility_score: number | null
    bias_score: number | null
    consumed_at: string
  }>
}

interface ContentPreferences {
  daily_time_limit_minutes: number
  daily_article_limit: number
  daily_video_limit: number
  daily_social_limit: number
  min_credibility_score: number
  max_bias_score: number
  break_reminders_enabled: boolean
  break_interval_minutes: number
  wellness_goals: string[]
  notifications_enabled: boolean
}

export function useContentMonitoring() {
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  
  const [session, setSession] = useState<ContentSession>({
    isActive: false,
    startTime: null,
    totalTime: 0,
    contentCount: 0
  })
  
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [preferences, setPreferences] = useState<ContentPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Track time spent on current content
  const contentStartTime = useRef<Date | null>(null)
  const currentContentType = useRef<'article' | 'video' | 'social' | null>(null)
  const timeTrackingInterval = useRef<NodeJS.Timeout | null>(null)

  // API call helper
  const apiCall = useCallback(async (method: string, endpoint: string, data?: any) => {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'API request failed')
      }

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Start a content consumption session
  const startSession = useCallback(async () => {
    if (!user || session.isActive) return

    try {
      setIsLoading(true)
      setError(null)
      
      await apiCall('POST', '/api/content-monitoring', {
        action: 'start_session'
      })
      
      setSession({
        isActive: true,
        startTime: new Date(),
        totalTime: 0,
        contentCount: 0
      })
    } catch (err) {
      console.error('Failed to start content session:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user, session.isActive, apiCall])

  // End the content consumption session
  const endSession = useCallback(async () => {
    if (!user || !session.isActive) return

    try {
      setIsLoading(true)
      setError(null)
      
      // Stop any active content tracking
      if (timeTrackingInterval.current) {
        clearInterval(timeTrackingInterval.current)
        timeTrackingInterval.current = null
      }
      
      // Log the last content if any
      if (contentStartTime.current && currentContentType.current) {
        const timeSpent = Math.round((Date.now() - contentStartTime.current.getTime()) / 1000)
        if (timeSpent > 5) { // Only log if spent more than 5 seconds
          await logContentConsumption(
            currentContentType.current,
            timeSpent
          )
        }
      }
      
      await apiCall('POST', '/api/content-monitoring', {
        action: 'end_session'
      })
      
      setSession({
        isActive: false,
        startTime: null,
        totalTime: 0,
        contentCount: 0
      })
      
      contentStartTime.current = null
      currentContentType.current = null
    } catch (err) {
      console.error('Failed to end content session:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user, session.isActive, apiCall])

  // Log content consumption
  const logContentConsumption = useCallback(async (
    contentType: 'article' | 'video' | 'social',
    timeSpent: number,
    credibilityScore?: number,
    biasScore?: number,
    contentUrl?: string,
    contentTitle?: string
  ) => {
    if (!user) return

    try {
      await apiCall('POST', '/api/content-monitoring', {
        action: 'update_session',
        data: {
          content_type: contentType,
          time_spent: timeSpent,
          credibility_score: credibilityScore,
          bias_score: biasScore,
          content_url: contentUrl,
          content_title: contentTitle
        }
      })
      
      // Update local session state
      setSession(prev => ({
        ...prev,
        totalTime: prev.totalTime + timeSpent,
        contentCount: prev.contentCount + 1
      }))
      
      // Refresh today's stats
      await fetchTodayStats()
    } catch (err) {
      console.error('Failed to log content consumption:', err)
    }
  }, [user, apiCall])

  // Start tracking time for a specific content
  const startContentTracking = useCallback((
    contentType: 'article' | 'video' | 'social',
    contentUrl?: string,
    contentTitle?: string
  ) => {
    // Stop previous tracking if any
    if (timeTrackingInterval.current) {
      clearInterval(timeTrackingInterval.current)
    }
    
    // Log previous content if any
    if (contentStartTime.current && currentContentType.current) {
      const timeSpent = Math.round((Date.now() - contentStartTime.current.getTime()) / 1000)
      if (timeSpent > 5) {
        logContentConsumption(currentContentType.current, timeSpent)
      }
    }
    
    // Start new tracking
    contentStartTime.current = new Date()
    currentContentType.current = contentType
    
    // Set up interval to periodically log time (every 30 seconds)
    timeTrackingInterval.current = setInterval(() => {
      if (contentStartTime.current && currentContentType.current) {
        const timeSpent = Math.round((Date.now() - contentStartTime.current.getTime()) / 1000)
        if (timeSpent >= 30) {
          logContentConsumption(
            currentContentType.current,
            timeSpent,
            undefined,
            undefined,
            contentUrl,
            contentTitle
          )
          contentStartTime.current = new Date() // Reset timer
        }
      }
    }, 30000) // 30 seconds
  }, [logContentConsumption])

  // Stop tracking current content
  const stopContentTracking = useCallback(() => {
    if (timeTrackingInterval.current) {
      clearInterval(timeTrackingInterval.current)
      timeTrackingInterval.current = null
    }
    
    // Log the final time for current content
    if (contentStartTime.current && currentContentType.current) {
      const timeSpent = Math.round((Date.now() - contentStartTime.current.getTime()) / 1000)
      if (timeSpent > 5) {
        logContentConsumption(currentContentType.current, timeSpent)
      }
    }
    
    contentStartTime.current = null
    currentContentType.current = null
  }, [logContentConsumption])

  // Fetch today's consumption statistics
  const fetchTodayStats = useCallback(async () => {
    if (!user) return

    try {
      const response = await apiCall('GET', '/api/content-monitoring?action=today_stats')
      setTodayStats(response.data)
    } catch (err) {
      console.error('Failed to fetch today stats:', err)
    }
  }, [user, apiCall])

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return

    try {
      const response = await apiCall('GET', '/api/content-monitoring?action=preferences')
      setPreferences(response.data)
    } catch (err) {
      console.error('Failed to fetch preferences:', err)
    }
  }, [user, apiCall])

  // Check various monitoring conditions
  const checkLimits = useCallback(async (contentType: 'article' | 'video' | 'social') => {
    if (!user) return

    try {
      await apiCall('POST', '/api/content-monitoring', {
        action: 'check_limits',
        data: { content_type: contentType }
      })
    } catch (err) {
      console.error('Failed to check limits:', err)
    }
  }, [user, apiCall])

  const checkBreakReminders = useCallback(async () => {
    if (!user) return

    try {
      await apiCall('POST', '/api/content-monitoring', {
        action: 'check_break'
      })
    } catch (err) {
      console.error('Failed to check break reminders:', err)
    }
  }, [user, apiCall])

  const checkContentQuality = useCallback(async () => {
    if (!user) return

    try {
      await apiCall('POST', '/api/content-monitoring', {
        action: 'check_quality'
      })
    } catch (err) {
      console.error('Failed to check content quality:', err)
    }
  }, [user, apiCall])

  const checkWellnessGoals = useCallback(async () => {
    if (!user) return

    try {
      await apiCall('POST', '/api/content-monitoring', {
        action: 'check_wellness'
      })
    } catch (err) {
      console.error('Failed to check wellness goals:', err)
    }
  }, [user, apiCall])

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  // Auto-start session when user is authenticated
  useEffect(() => {
    if (user && !session.isActive) {
      startSession()
    }
  }, [user, session.isActive, startSession])

  // Fetch initial data
  useEffect(() => {
    if (user) {
      fetchTodayStats()
      fetchPreferences()
    }
  }, [user, fetchTodayStats, fetchPreferences])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeTrackingInterval.current) {
        clearInterval(timeTrackingInterval.current)
      }
    }
  }, [])

  // Auto-end session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session.isActive) {
        endSession()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [session.isActive, endSession])

  return {
    // Session state
    session,
    todayStats,
    preferences,
    isLoading,
    error,
    
    // Session management
    startSession,
    endSession,
    
    // Content tracking
    startContentTracking,
    stopContentTracking,
    logContentConsumption,
    
    // Monitoring checks
    checkLimits,
    checkBreakReminders,
    checkContentQuality,
    checkWellnessGoals,
    
    // Data fetching
    fetchTodayStats,
    fetchPreferences,
    
    // Utility
    clearError: () => setError(null)
  }
}