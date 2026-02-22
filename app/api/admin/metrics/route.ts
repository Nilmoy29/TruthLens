import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { withAdmin, withDatabaseErrorHandling, RequestContext } from '@/lib/api-middleware';
import { AppError, ErrorType } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
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
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d'; // 7d, 30d, 90d, 1y
    const includeDetails = searchParams.get('details') === 'true';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user statistics
    const { data: userStats, error: userError } = await supabase
      .from('profiles')
      .select('role, status, subscription_tier, created_at')
      .gte('created_at', startDate.toISOString());

    if (userError) {
      console.error('Error fetching user stats:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user statistics' },
        { status: 500 }
      );
    }

    // Get analysis statistics
    const [factCheckStats, biasAnalysisStats, mediaVerifyStats] = await Promise.all([
      supabase
        .from('fact_checks')
        .select('created_at, credibility_score')
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('bias_analyses')
        .select('created_at, bias_score')
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('media_verifications')
        .select('created_at, authenticity')
        .gte('created_at', startDate.toISOString())
    ]);

    if (factCheckStats.error || biasAnalysisStats.error || mediaVerifyStats.error) {
      console.error('Error fetching analysis stats:', {
        factCheck: factCheckStats.error,
        biasAnalysis: biasAnalysisStats.error,
        mediaVerify: mediaVerifyStats.error
      });
      return NextResponse.json(
        { error: 'Failed to fetch analysis statistics' },
        { status: 500 }
      );
    }

    // Get usage logs for API performance
    const { data: usageLogs, error: usageError } = await supabase
      .from('usage_logs')
      .select('endpoint, status_code, response_time_ms, created_at')
      .gte('created_at', startDate.toISOString());

    if (usageError) {
      console.error('Error fetching usage logs:', usageError);
    }

    // Calculate metrics
    const totalUsers = userStats?.length || 0;
    const activeUsers = userStats?.filter(u => u.status === 'active').length || 0;
    const adminUsers = userStats?.filter(u => u.role === 'admin').length || 0;
    const proUsers = userStats?.filter(u => u.subscription_tier === 'pro').length || 0;
    const enterpriseUsers = userStats?.filter(u => u.subscription_tier === 'enterprise').length || 0;

    const totalFactChecks = factCheckStats.data?.length || 0;
    const totalBiasAnalyses = biasAnalysisStats.data?.length || 0;
    const totalMediaVerifications = mediaVerifyStats.data?.length || 0;
    const totalAnalyses = totalFactChecks + totalBiasAnalyses + totalMediaVerifications;

    // Calculate average scores
    const avgCredibilityScore = factCheckStats.data?.length > 0 
      ? factCheckStats.data.reduce((sum, item) => sum + (item.credibility_score || 0), 0) / factCheckStats.data.length
      : 0;

    const avgBiasScore = biasAnalysisStats.data?.length > 0
      ? biasAnalysisStats.data.reduce((sum, item) => sum + (item.bias_score || 0), 0) / biasAnalysisStats.data.length
      : 0;

    const avgAuthenticityScore = mediaVerifyStats.data?.length > 0
      ? mediaVerifyStats.data.reduce((sum, item) => {
          const score = item.authenticity?.score || 0;
          return sum + score;
        }, 0) / mediaVerifyStats.data.length
      : 0;

    // Calculate API performance metrics
    const totalApiCalls = usageLogs?.length || 0;
    const successfulCalls = usageLogs?.filter(log => log.status_code >= 200 && log.status_code < 300).length || 0;
    const errorRate = totalApiCalls > 0 ? ((totalApiCalls - successfulCalls) / totalApiCalls) * 100 : 0;
    const avgResponseTime = (usageLogs && usageLogs.length > 0)
      ? usageLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / usageLogs.length
      : 0;

    // Group data by day for charts (if details requested)
    let dailyStats = null;
    if (includeDetails) {
      const days = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      dailyStats = Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayFactChecks = factCheckStats.data?.filter(item => 
          item.created_at.startsWith(dateStr)
        ).length || 0;
        
        const dayBiasAnalyses = biasAnalysisStats.data?.filter(item => 
          item.created_at.startsWith(dateStr)
        ).length || 0;
        
        const dayMediaVerifications = mediaVerifyStats.data?.filter(item => 
          item.created_at.startsWith(dateStr)
        ).length || 0;
        
        const dayUsers = userStats?.filter(user => 
          user.created_at.startsWith(dateStr)
        ).length || 0;

        return {
          date: dateStr,
          factChecks: dayFactChecks,
          biasAnalyses: dayBiasAnalyses,
          mediaVerifications: dayMediaVerifications,
          newUsers: dayUsers,
          totalAnalyses: dayFactChecks + dayBiasAnalyses + dayMediaVerifications
        };
      });
    }

    // Endpoint usage breakdown
    const endpointStats = usageLogs?.reduce((acc: any, log) => {
      const endpoint = log.endpoint;
      if (!acc[endpoint]) {
        acc[endpoint] = { calls: 0, avgResponseTime: 0, errors: 0 };
      }
      acc[endpoint].calls++;
      acc[endpoint].avgResponseTime += log.response_time_ms || 0;
      if (log.status_code >= 400) {
        acc[endpoint].errors++;
      }
      return acc;
    }, {});

    // Calculate average response times
    Object.keys(endpointStats || {}).forEach(endpoint => {
      endpointStats[endpoint].avgResponseTime = 
        endpointStats[endpoint].avgResponseTime / endpointStats[endpoint].calls;
    });

    const metrics = {
      timeframe,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        pro: proUsers,
        enterprise: enterpriseUsers,
        free: totalUsers - proUsers - enterpriseUsers
      },
      analyses: {
        total: totalAnalyses,
        factChecks: totalFactChecks,
        biasAnalyses: totalBiasAnalyses,
        mediaVerifications: totalMediaVerifications
      },
      averageScores: {
        credibility: Math.round(avgCredibilityScore * 100) / 100,
        bias: Math.round(avgBiasScore * 100) / 100,
        authenticity: Math.round(avgAuthenticityScore * 100) / 100
      },
      api: {
        totalCalls: totalApiCalls,
        successfulCalls,
        errorRate: Math.round(errorRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100
      },
      ...(includeDetails && {
        dailyStats,
        endpointStats
      })
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Admin metrics GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}