import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';



interface ConsumptionPattern {
  totalTimeSpent: number;
  averageCredibility: number;
  averageBias: number;
  contentTypes: Record<string, number>;
  sources: Record<string, number>;
  timeDistribution: Record<string, number>;
  completionRate: number;
}

interface HealthAlert {
  type: 'consumption_limit' | 'unhealthy_content' | 'break_reminder' | 'content_recommendation';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  recommendations: string[];
  data?: any;
}

// GET: Analyze user's content consumption patterns (no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const includeAlerts = searchParams.get('include_alerts') === 'true';

    // Return mock consumption patterns for demo
    const mockPatterns: ConsumptionPattern = {
      totalTimeSpent: 180,
      averageCredibility: 0.85,
      averageBias: 0.15,
      contentTypes: {
        'article': 12,
        'video': 8,
        'social_post': 25
      },
      sources: {
        'BBC News': 5,
        'The Guardian': 4,
        'YouTube': 8,
        'Twitter': 15,
        'Reddit': 10
      },
      timeDistribution: {
        'morning': 45,
        'afternoon': 75,
        'evening': 60
      },
      completionRate: 0.78
    };
    
    let mockAlerts: HealthAlert[] = [];
    if (includeAlerts) {
      mockAlerts = [
        {
          type: 'break_reminder',
          severity: 'medium',
          title: 'Take a Break',
          message: 'You\'ve been consuming content for 2 hours straight. Consider taking a 10-minute break.',
          recommendations: [
            'Step away from screens for 10 minutes',
            'Do some light stretching',
            'Practice deep breathing'
          ]
        },
        {
          type: 'content_recommendation',
          severity: 'low',
          title: 'Diversify Your Sources',
          message: 'You\'ve been reading from similar sources. Try exploring different perspectives.',
          recommendations: [
            'Read from international news sources',
            'Check fact-checking websites',
            'Look for expert analysis on the topic'
          ]
        }
      ];
    }

    // Create mock date range for demo
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return NextResponse.json({
      patterns: mockPatterns,
      alerts: mockAlerts,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Content analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Generate AI-powered content health insights
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patterns, preferences, logs } = await request.json();

    // Generate AI insights using Groq
    const insights = await generateAIInsights(patterns, preferences, logs);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('AI insights generation error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}

function analyzeConsumptionPatterns(logs: any[]): ConsumptionPattern {
  if (logs.length === 0) {
    return {
      totalTimeSpent: 0,
      averageCredibility: 0,
      averageBias: 0,
      contentTypes: {},
      sources: {},
      timeDistribution: {},
      completionRate: 0,
    };
  }

  const totalTimeSpent = logs.reduce((sum, log) => sum + (log.time_spent || 0), 0);
  const credibilityScores = logs.filter(log => log.credibility_score !== null).map(log => log.credibility_score);
  const biasScores = logs.filter(log => log.bias_score !== null).map(log => log.bias_score);
  
  const averageCredibility = credibilityScores.length > 0 
    ? credibilityScores.reduce((sum, score) => sum + score, 0) / credibilityScores.length 
    : 0;
  
  const averageBias = biasScores.length > 0 
    ? biasScores.reduce((sum, score) => sum + score, 0) / biasScores.length 
    : 0;

  // Analyze content types
  const contentTypes: Record<string, number> = {};
  logs.forEach(log => {
    if (log.content_type) {
      contentTypes[log.content_type] = (contentTypes[log.content_type] || 0) + 1;
    }
  });

  // Analyze sources
  const sources: Record<string, number> = {};
  logs.forEach(log => {
    if (log.source) {
      sources[log.source] = (sources[log.source] || 0) + 1;
    }
  });

  // Analyze time distribution (by hour)
  const timeDistribution: Record<string, number> = {};
  logs.forEach(log => {
    const hour = new Date(log.consumed_at).getHours();
    const hourKey = `${hour}:00`;
    timeDistribution[hourKey] = (timeDistribution[hourKey] || 0) + 1;
  });

  // Calculate completion rate
  const completedLogs = logs.filter(log => (log.completion_percentage || 0) >= 80);
  const completionRate = logs.length > 0 ? completedLogs.length / logs.length : 0;

  return {
    totalTimeSpent,
    averageCredibility,
    averageBias,
    contentTypes,
    sources,
    timeDistribution,
    completionRate,
  };
}

async function generateHealthAlerts(
  patterns: ConsumptionPattern,
  preferences: any,
  logs: any[]
): Promise<HealthAlert[]> {
  const alerts: HealthAlert[] = [];
  const today = new Date();
  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.consumed_at);
    return logDate.toDateString() === today.toDateString();
  });

  // Check daily consumption limit
  const todayTimeSpent = todayLogs.reduce((sum, log) => sum + (log.time_spent || 0), 0);
  const dailyLimit = preferences.daily_consumption_limit || 120; // minutes
  
  if (todayTimeSpent > dailyLimit) {
    alerts.push({
      type: 'consumption_limit',
      severity: 'high',
      title: 'Daily Consumption Limit Exceeded',
      message: `You've spent ${Math.round(todayTimeSpent)} minutes consuming content today, exceeding your ${dailyLimit}-minute limit.`,
      recommendations: [
        'Take a break from content consumption',
        'Consider engaging in offline activities',
        'Review your daily consumption goals'
      ],
      data: { timeSpent: todayTimeSpent, limit: dailyLimit }
    });
  }

  // Check for unhealthy content patterns
  if (patterns.averageCredibility < 0.6) {
    alerts.push({
      type: 'unhealthy_content',
      severity: 'medium',
      title: 'Low Credibility Content Detected',
      message: `Your recent content has an average credibility score of ${(patterns.averageCredibility * 100).toFixed(1)}%.`,
      recommendations: [
        'Seek out more reliable news sources',
        'Fact-check information before sharing',
        'Diversify your content sources'
      ],
      data: { averageCredibility: patterns.averageCredibility }
    });
  }

  // Check for high bias consumption
  if (Math.abs(patterns.averageBias) > 0.7) {
    alerts.push({
      type: 'unhealthy_content',
      severity: 'medium',
      title: 'High Bias Content Detected',
      message: `Your content shows a strong bias tendency (${patterns.averageBias > 0 ? 'right' : 'left'}-leaning).`,
      recommendations: [
        'Seek diverse perspectives on topics',
        'Read content from various political viewpoints',
        'Practice critical thinking when consuming news'
      ],
      data: { averageBias: patterns.averageBias }
    });
  }

  // Check for break reminders (if consuming for more than 2 hours straight)
  const recentLogs = logs.slice(0, 10); // Last 10 items
  const recentTimeSpent = recentLogs.reduce((sum, log) => sum + (log.time_spent || 0), 0);
  
  if (recentTimeSpent > 120) { // 2 hours
    alerts.push({
      type: 'break_reminder',
      severity: 'low',
      title: 'Time for a Break',
      message: 'You\'ve been consuming content for an extended period. Consider taking a break.',
      recommendations: [
        'Take a 15-minute walk',
        'Do some stretching exercises',
        'Practice the 20-20-20 rule for eye health'
      ],
      data: { recentTimeSpent }
    });
  }

  return alerts;
}

async function generateAIInsights(
  patterns: ConsumptionPattern,
  preferences: any,
  logs: any[]
): Promise<string> {
  try {
    const prompt = `
Analyze the following user's content consumption patterns and provide personalized health insights:

Consumption Patterns:
- Total time spent: ${patterns.totalTimeSpent} minutes
- Average credibility: ${(patterns.averageCredibility * 100).toFixed(1)}%
- Average bias: ${patterns.averageBias.toFixed(2)}
- Content types: ${JSON.stringify(patterns.contentTypes)}
- Completion rate: ${(patterns.completionRate * 100).toFixed(1)}%

User Preferences:
- Daily limit: ${preferences?.daily_consumption_limit || 'Not set'} minutes
- Wellness goals: ${preferences?.wellness_goals || 'Not specified'}
- Quality preferences: ${JSON.stringify(preferences?.quality_preferences || {})}

Provide:
1. A brief assessment of their content consumption health
2. 3-4 specific, actionable recommendations
3. Positive reinforcement for good habits (if any)
4. Warning about concerning patterns (if any)

Keep the response concise, encouraging, and focused on promoting healthy content consumption habits.
`;

    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      prompt,
      temperature: 0.7,
    });

    return text || 'Unable to generate insights at this time.';
  } catch (error) {
    console.error('AI insights generation error:', error);
    return 'Unable to generate AI insights at this time. Please try again later.';
  }
}