import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Logger } from '@/lib/error-handler'
import {
  startContentSession,
  updateContentSession,
  endContentSession,
  checkContentLimits,
  checkBreakReminders,
  checkContentQuality,
  checkWellnessGoals
} from '@/lib/content-monitoring'
import { runScheduledTasks } from '@/lib/content-scheduler'

// POST /api/content-monitoring - Track content consumption
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'start_session':
        await startContentSession(user.id)
        return NextResponse.json({ success: true, message: 'Session started' })

      case 'update_session':
        const {
          content_type,
          time_spent,
          credibility_score,
          bias_score,
          content_url,
          content_title
        } = data

        if (!content_type || time_spent === undefined) {
          return NextResponse.json(
            { error: 'Missing required fields: content_type, time_spent' },
            { status: 400 }
          )
        }

        // Log the consumption to database
        const { error: logError } = await supabase
          .from('content_consumption_logs')
          .insert({
            user_id: user.id,
            content_type,
            content_url: content_url || null,
            content_title: content_title || null,
            time_spent,
            credibility_score: credibility_score || null,
            bias_score: bias_score || null,
            consumed_at: new Date().toISOString()
          })

        if (logError) {
          Logger.error('Failed to log content consumption', {
            error: logError.message,
            userId: user.id,
            contentType: content_type
          })
        }

        // Update the active session
        await updateContentSession(
          user.id,
          content_type,
          time_spent,
          credibility_score,
          bias_score
        )

        return NextResponse.json({ success: true, message: 'Session updated' })

      case 'end_session':
        await endContentSession(user.id)
        return NextResponse.json({ success: true, message: 'Session ended' })

      case 'check_limits':
        await checkContentLimits(user.id, data.content_type || 'article')
        return NextResponse.json({ success: true, message: 'Limits checked' })

      case 'check_break':
        await checkBreakReminders(user.id)
        return NextResponse.json({ success: true, message: 'Break reminders checked' })

      case 'check_quality':
        await checkContentQuality(user.id)
        return NextResponse.json({ success: true, message: 'Content quality checked' })

      case 'check_wellness':
        await checkWellnessGoals(user.id)
        return NextResponse.json({ success: true, message: 'Wellness goals checked' })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: start_session, update_session, end_session, check_limits, check_break, check_quality, check_wellness' },
          { status: 400 }
        )
    }
  } catch (error) {
    Logger.error('Content monitoring API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/content-monitoring - Get current session status
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'today_stats') {
      // Get today's consumption statistics
      const today = new Date().toISOString().split('T')[0]
      
      const { data: logs, error } = await supabase
        .from('content_consumption_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('consumed_at', `${today}T00:00:00.000Z`)
        .lt('consumed_at', `${today}T23:59:59.999Z`)
        .order('consumed_at', { ascending: false })

      if (error) {
        Logger.error('Failed to fetch consumption logs', {
          error: error.message,
          userId: user.id
        })
        return NextResponse.json(
          { error: 'Failed to fetch consumption data' },
          { status: 500 }
        )
      }

      // Calculate statistics
      const stats = {
        total_time: logs.reduce((sum, log) => sum + (log.time_spent || 0), 0),
        total_content: logs.length,
        articles: logs.filter(log => log.content_type === 'article').length,
        videos: logs.filter(log => log.content_type === 'video').length,
        social: logs.filter(log => log.content_type === 'social').length,
        average_credibility: logs.length > 0 
          ? logs.filter(log => log.credibility_score !== null)
               .reduce((sum, log) => sum + log.credibility_score, 0) / 
            logs.filter(log => log.credibility_score !== null).length || 0
          : 0,
        average_bias: logs.length > 0 
          ? logs.filter(log => log.bias_score !== null)
               .reduce((sum, log) => sum + log.bias_score, 0) / 
            logs.filter(log => log.bias_score !== null).length || 0
          : 0,
        recent_content: logs.slice(0, 10).map(log => ({
          type: log.content_type,
          title: log.content_title,
          url: log.content_url,
          time_spent: log.time_spent,
          credibility_score: log.credibility_score,
          bias_score: log.bias_score,
          consumed_at: log.consumed_at
        }))
      }

      return NextResponse.json({ success: true, data: stats })
    }

    if (action === 'preferences') {
      // Get user's content preferences
      const { data: preferences, error } = await supabase
        .from('content_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        Logger.error('Failed to fetch content preferences', {
          error: error.message,
          userId: user.id
        })
        return NextResponse.json(
          { error: 'Failed to fetch preferences' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        data: preferences || null 
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: today_stats, preferences' },
      { status: 400 }
    )
  } catch (error) {
    Logger.error('Content monitoring GET API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/content-monitoring - Trigger scheduled tasks (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { task_type, admin_key } = body

    // Simple admin authentication (in production, use proper admin auth)
    if (admin_key !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!['daily', 'hourly', 'cleanup'].includes(task_type)) {
      return NextResponse.json(
        { error: 'Invalid task_type. Supported: daily, hourly, cleanup' },
        { status: 400 }
      )
    }

    await runScheduledTasks(task_type)

    return NextResponse.json({ 
      success: true, 
      message: `${task_type} tasks executed successfully` 
    })
  } catch (error) {
    Logger.error('Content monitoring PUT API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}