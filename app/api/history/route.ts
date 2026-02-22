import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withDatabaseErrorHandling, RequestContext } from '@/lib/api-middleware';
import { AppError, ErrorType } from '@/lib/error-handler';

async function getHistory(request: NextRequest, context: RequestContext) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const offset = (page - 1) * limit;
  let history: any[] = [];
  let totalCount = 0;

  // Helper function to build query with common filters
  const buildQuery = (table: string) => {
    let query = context.supabase
      .from(table)
      .select('*', { count: 'exact' })
      .eq('user_id', context.user!.id);

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    return query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);
  };

  if (type === 'all') {
    // Fetch from all tables and combine
    const results = await withDatabaseErrorHandling(
      async () => {
        const [factChecks, biasAnalyses, mediaVerifications] = await Promise.all([
          buildQuery('fact_checks'),
          buildQuery('bias_analyses'),
          buildQuery('media_verifications')
        ]);

        return {
          factChecks: factChecks.data || [],
          biasAnalyses: biasAnalyses.data || [],
          mediaVerifications: mediaVerifications.data || []
        };
      },
      'fetch all history'
    );

    const allResults = [
      ...results.factChecks.map((item: any) => ({ ...item, type: 'fact-check' })),
      ...results.biasAnalyses.map((item: any) => ({ ...item, type: 'bias-analysis' })),
      ...results.mediaVerifications.map((item: any) => ({ ...item, type: 'media-verify' }))
    ];

    // Sort combined results
    allResults.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    history = allResults.slice(offset, offset + limit);
    totalCount = allResults.length;
  } else {
    // Fetch from specific table
    let tableName = '';
    switch (type) {
      case 'fact-check':
        tableName = 'fact_checks';
        break;
      case 'bias-analysis':
        tableName = 'bias_analyses';
        break;
      case 'media-verify':
        tableName = 'media_verifications';
        break;
      default:
        throw new AppError(
          'Invalid type parameter',
          ErrorType.VALIDATION,
          400
        );
    }

    const result = await withDatabaseErrorHandling(
      () => buildQuery(tableName),
      `fetch ${type} history`
    );

    history = ((result as any).data || []).map((item: any) => ({ ...item, type }));
    totalCount = (result as any).count || 0;
  }

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    history,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}

export const GET = withAuth(getHistory);

async function deleteHistoryItem(request: NextRequest, context: RequestContext) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('id');
  const itemType = searchParams.get('type');

  if (!itemId || !itemType) {
    throw new AppError(
      'Missing id or type parameter',
      ErrorType.VALIDATION,
      400
    );
  }

  let tableName: string;
  switch (itemType) {
    case 'fact-check':
      tableName = 'fact_checks';
      break;
    case 'bias-analysis':
      tableName = 'bias_analyses';
      break;
    case 'media-verify':
      tableName = 'media_verifications';
      break;
    default:
      throw new AppError(
        'Invalid type parameter',
        ErrorType.VALIDATION,
        400
      );
  }

  await withDatabaseErrorHandling(
    () => context.supabase
      .from(tableName)
      .delete()
      .eq('id', itemId)
      .eq('user_id', context.user!.id),
    `delete ${itemType}`
  );

  return NextResponse.json({ 
    message: `${itemType} deleted successfully`,
    deletedId: itemId,
    deletedType: itemType
  });
}

export const DELETE = withAuth(deleteHistoryItem);