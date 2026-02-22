import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Get content calendar for a specific date or date range (no auth required)
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const includeConsumption = searchParams.get('include_consumption') === 'true';

    // Return mock data for demo purposes since we don't have user-specific data
    const mockCalendarData = {
      id: 'demo-calendar-' + date,
      calendar_date: date,
      daily_theme: 'Balanced Information Diet',
      wellness_tip: 'Take breaks between consuming different types of content to process information effectively.',
      daily_goals: [
        'Read 2 credible news articles',
        'Watch 1 educational video',
        'Limit social media to 30 minutes',
        'Fact-check one piece of information'
      ],
      recommended_content: [
        {
          id: 'rec-1',
          title: 'Understanding Media Bias in Digital Age',
          type: 'article',
          url: 'https://example.com/media-bias-article',
          source: 'Digital Literacy Journal',
          estimatedTime: 15,
          credibilityScore: 0.92,
          biasScore: 0.15,
          description: 'A comprehensive guide to identifying and understanding media bias in online content.',
          consumed: false
        },
        {
          id: 'rec-2',
          title: 'Fact-Checking Techniques for Everyone',
          type: 'video',
          url: 'https://example.com/fact-checking-video',
          source: 'Truth Seekers Media',
          estimatedTime: 12,
          credibilityScore: 0.88,
          biasScore: 0.08,
          description: 'Learn practical techniques for verifying information online.',
          consumed: false
        },
        {
          id: 'rec-3',
          title: 'The Psychology of Misinformation',
          type: 'podcast',
          url: 'https://example.com/psychology-podcast',
          source: 'Science Today Podcast',
          estimatedTime: 25,
          credibilityScore: 0.95,
          biasScore: 0.05,
          description: 'Exploring why people believe and share false information.',
          consumed: false
        }
      ],
      planned_consumption: {
        total_time_planned: 60,
        articles: 2,
        videos: 1,
        social_posts: 5
      },
      actual_consumption: {
        total_time_spent: 0,
        articles_read: 0,
        videos_watched: 0,
        social_posts_viewed: 0
      },
      wellness_score: 85
    };

    const mockConsumptionLogs = includeConsumption ? [
      {
        id: 'log-1',
        content_type: 'article',
        url: 'https://example.com/sample-article',
        source: 'Demo News',
        time_spent: 10,
        completion_percentage: 100,
        credibility_score: 0.9,
        bias_score: 0.1,
        consumed_at: new Date().toISOString()
      }
    ] : [];

    return NextResponse.json({
      success: true,
      data: mockCalendarData,
      consumption_logs: mockConsumptionLogs
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

// Generate AI-powered daily content recommendations (no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const targetDate = body.date || new Date().toISOString().split('T')[0];

    // Return success response for demo purposes
    return NextResponse.json({
      success: true,
      message: 'Recommendations generated successfully',
      data: {
        date: targetDate,
        generated: true
      }
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

// Update calendar entry (no auth required)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Return success response for demo purposes
    return NextResponse.json({
      success: true,
      data: body,
      message: 'Calendar updated successfully'
    });
  } catch (error) {
    console.error('Error updating calendar:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar' },
      { status: 500 }
    );
  }
}