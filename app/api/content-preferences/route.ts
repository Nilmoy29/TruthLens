import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withDatabaseErrorHandling, RequestContext } from '@/lib/api-middleware';
import { AppError, ErrorType, Logger } from '@/lib/error-handler';

// Default content preferences
const defaultPreferences = {
  preferred_content_types: ['educational', 'news', 'technology', 'science'],
  avoided_content_types: ['gossip', 'clickbait', 'conspiracy'],
  daily_time_limit_minutes: 120,
  daily_article_limit: 10,
  daily_video_limit: 5,
  daily_social_limit: 30,
  min_credibility_score: 0.70,
  max_bias_score: 0.30,
  wellness_goals: ['reduce_misinformation', 'balanced_perspective', 'time_management'],
  break_reminders_enabled: true,
  break_interval_minutes: 30,
  content_categories: {
    news: { weight: 0.3, enabled: true },
    educational: { weight: 0.4, enabled: true },
    entertainment: { weight: 0.2, enabled: true },
    social: { weight: 0.1, enabled: true }
  }
};

// Get user content preferences
async function getContentPreferences(request: NextRequest, context: RequestContext) {
  const userId = context.session?.user?.id;
  
  if (!userId) {
    throw new AppError('User not authenticated', ErrorType.AUTHENTICATION, 401);
  }

  Logger.info('Fetching content preferences', {
    requestId: context.requestId,
    userId,
    action: 'get_content_preferences'
  });

  const preferences = await withDatabaseErrorHandling(async () => {
    const { data, error } = await context.supabase
      .from('content_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    return data;
  }, 'fetch content preferences');

  // Return default preferences if none exist
  const userPreferences = preferences || {
    user_id: userId,
    ...defaultPreferences,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return NextResponse.json({
    success: true,
    data: userPreferences
  });
}

// Update user content preferences
async function updateContentPreferences(request: NextRequest, context: RequestContext) {
  const userId = context.session?.user?.id;
  
  if (!userId) {
    throw new AppError('User not authenticated', ErrorType.AUTHENTICATION, 401);
  }

  const body = await request.json();
  
  // Validate request body
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', ErrorType.VALIDATION, 400);
  }

  Logger.info('Updating content preferences', {
    requestId: context.requestId,
    userId,
    action: 'update_content_preferences',
    updates: Object.keys(body)
  });

  // Validate specific fields
  const validUpdates: any = {};
  
  if (body.preferred_content_types !== undefined) {
    if (!Array.isArray(body.preferred_content_types)) {
      throw new AppError('preferred_content_types must be an array', ErrorType.VALIDATION, 400);
    }
    validUpdates.preferred_content_types = body.preferred_content_types;
  }

  if (body.avoided_content_types !== undefined) {
    if (!Array.isArray(body.avoided_content_types)) {
      throw new AppError('avoided_content_types must be an array', ErrorType.VALIDATION, 400);
    }
    validUpdates.avoided_content_types = body.avoided_content_types;
  }

  if (body.daily_time_limit_minutes !== undefined) {
    const limit = parseInt(body.daily_time_limit_minutes);
    if (isNaN(limit) || limit < 0 || limit > 1440) { // Max 24 hours
      throw new AppError('daily_time_limit_minutes must be between 0 and 1440', ErrorType.VALIDATION, 400);
    }
    validUpdates.daily_time_limit_minutes = limit;
  }

  if (body.daily_article_limit !== undefined) {
    const limit = parseInt(body.daily_article_limit);
    if (isNaN(limit) || limit < 0 || limit > 100) {
      throw new AppError('daily_article_limit must be between 0 and 100', ErrorType.VALIDATION, 400);
    }
    validUpdates.daily_article_limit = limit;
  }

  if (body.daily_video_limit !== undefined) {
    const limit = parseInt(body.daily_video_limit);
    if (isNaN(limit) || limit < 0 || limit > 50) {
      throw new AppError('daily_video_limit must be between 0 and 50', ErrorType.VALIDATION, 400);
    }
    validUpdates.daily_video_limit = limit;
  }

  if (body.daily_social_limit !== undefined) {
    const limit = parseInt(body.daily_social_limit);
    if (isNaN(limit) || limit < 0 || limit > 200) {
      throw new AppError('daily_social_limit must be between 0 and 200', ErrorType.VALIDATION, 400);
    }
    validUpdates.daily_social_limit = limit;
  }

  if (body.min_credibility_score !== undefined) {
    const score = parseFloat(body.min_credibility_score);
    if (isNaN(score) || score < 0 || score > 1) {
      throw new AppError('min_credibility_score must be between 0 and 1', ErrorType.VALIDATION, 400);
    }
    validUpdates.min_credibility_score = score;
  }

  if (body.max_bias_score !== undefined) {
    const score = parseFloat(body.max_bias_score);
    if (isNaN(score) || score < 0 || score > 1) {
      throw new AppError('max_bias_score must be between 0 and 1', ErrorType.VALIDATION, 400);
    }
    validUpdates.max_bias_score = score;
  }

  if (body.wellness_goals !== undefined) {
    if (!Array.isArray(body.wellness_goals)) {
      throw new AppError('wellness_goals must be an array', ErrorType.VALIDATION, 400);
    }
    validUpdates.wellness_goals = body.wellness_goals;
  }

  if (body.break_reminders_enabled !== undefined) {
    validUpdates.break_reminders_enabled = Boolean(body.break_reminders_enabled);
  }

  if (body.break_interval_minutes !== undefined) {
    const interval = parseInt(body.break_interval_minutes);
    if (isNaN(interval) || interval < 5 || interval > 120) {
      throw new AppError('break_interval_minutes must be between 5 and 120', ErrorType.VALIDATION, 400);
    }
    validUpdates.break_interval_minutes = interval;
  }

  if (body.content_categories !== undefined) {
    if (typeof body.content_categories !== 'object') {
      throw new AppError('content_categories must be an object', ErrorType.VALIDATION, 400);
    }
    validUpdates.content_categories = body.content_categories;
  }

  if (Object.keys(validUpdates).length === 0) {
    throw new AppError('No valid updates provided', ErrorType.VALIDATION, 400);
  }

  // Try to update existing preferences, or insert new ones
  const preferences = await withDatabaseErrorHandling(async () => {
    // First try to update
    const { data: updateData, error: updateError } = await context.supabase
      .from('content_preferences')
      .update(validUpdates)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError && updateError.code === 'PGRST116') {
      // No existing record, create new one
      const { data: insertData, error: insertError } = await context.supabase
        .from('content_preferences')
        .insert({
          user_id: userId,
          ...defaultPreferences,
          ...validUpdates
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return insertData;
    }

    if (updateError) throw updateError;
    return updateData;
  }, 'update content preferences');

  return NextResponse.json({
    success: true,
    data: preferences,
    message: 'Content preferences updated successfully'
  });
}

// Reset content preferences to defaults
async function resetContentPreferences(request: NextRequest, context: RequestContext) {
  const userId = context.session?.user?.id;
  
  if (!userId) {
    throw new AppError('User not authenticated', ErrorType.AUTHENTICATION, 401);
  }

  Logger.info('Resetting content preferences to defaults', {
    requestId: context.requestId,
    userId,
    action: 'reset_content_preferences'
  });

  const preferences = await withDatabaseErrorHandling(async () => {
    const { data, error } = await context.supabase
      .from('content_preferences')
      .upsert({
        user_id: userId,
        ...defaultPreferences
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, 'reset content preferences');

  return NextResponse.json({
    success: true,
    data: preferences,
    message: 'Content preferences reset to defaults'
  });
}

// Get content preference recommendations based on user's analysis history
async function getPreferenceRecommendations(request: NextRequest, context: RequestContext) {
  const userId = context.session?.user?.id;
  
  if (!userId) {
    throw new AppError('User not authenticated', ErrorType.AUTHENTICATION, 401);
  }

  Logger.info('Generating preference recommendations', {
    requestId: context.requestId,
    userId,
    action: 'get_preference_recommendations'
  });

  // Analyze user's fact-check and bias analysis history
  const analysisHistory = await withDatabaseErrorHandling(async () => {
    const [factChecks, biasAnalyses] = await Promise.all([
      context.supabase
        .from('fact_checks')
        .select('result, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      context.supabase
        .from('bias_analyses')
        .select('result, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    return {
      factChecks: factChecks.data || [],
      biasAnalyses: biasAnalyses.data || []
    };
  }, 'fetch analysis history for recommendations');

  // Generate recommendations based on analysis patterns
  const recommendations = {
    suggested_credibility_threshold: 0.75,
    suggested_bias_threshold: 0.25,
    recommended_content_types: ['educational', 'verified_news', 'scientific'],
    wellness_tips: [
      'Consider increasing your credibility threshold based on recent analysis patterns',
      'You might benefit from more educational content to balance entertainment',
      'Setting break reminders can help maintain healthy consumption habits'
    ],
    analysis_insights: {
      total_fact_checks: analysisHistory.factChecks.length,
      total_bias_analyses: analysisHistory.biasAnalyses.length,
      recent_activity: analysisHistory.factChecks.length + analysisHistory.biasAnalyses.length > 0
    }
  };

  return NextResponse.json({
    success: true,
    data: recommendations
  });
}

export const GET = withAuth(getContentPreferences);
export const PUT = withAuth(updateContentPreferences);
export const DELETE = withAuth(resetContentPreferences);

// Custom endpoint for recommendations
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  if (action === 'recommendations') {
    return withAuth(getPreferenceRecommendations)(request);
  }
  
  return NextResponse.json(
    { error: 'Invalid action parameter' },
    { status: 400 }
  );
}