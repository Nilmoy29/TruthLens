import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ErrorHandler, AppError, ErrorType, Logger, RateLimiter, generateRequestId } from './error-handler';

// Middleware options interface
interface MiddlewareOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs?: number;
  };
  validateBody?: (body: any) => void;
  logRequests?: boolean;
}

// Request context interface
export interface RequestContext {
  requestId: string;
  supabase: ReturnType<typeof createServerClient>;
  session?: any;
  user?: any;
  body?: any;
}

// API handler type
export type ApiHandler = (
  request: NextRequest,
  context: RequestContext
) => Promise<NextResponse>;

// Main middleware wrapper
export function withMiddleware(
  handler: ApiHandler,
  options: MiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // Log incoming request
      if (options.logRequests !== false) {
        Logger.info('API Request', {
          requestId,
          method: request.method,
          url: request.url,
          userAgent: request.headers.get('user-agent') || undefined,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
        });
      }

      // Rate limiting
      if (options.rateLimit) {
        const identifier = request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip') || 
                          'unknown';
        RateLimiter.checkRateLimit(identifier, options.rateLimit.maxRequests);
      }

      // Create Supabase client
      const supabase = createServerClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
          },
        }
      );

      // Initialize context
      const context: RequestContext = {
        requestId,
        supabase
      };

      // Authentication check
      if (options.requireAuth || options.requireAdmin) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new AppError(
            'Authentication required',
            ErrorType.AUTHENTICATION,
            401,
            true,
            requestId
          );
        }

        context.session = session;
        context.user = session.user;

        // Admin check
        if (options.requireAdmin) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileError || profile?.role !== 'admin') {
            throw new AppError(
              'Admin access required',
              ErrorType.AUTHORIZATION,
              403,
              true,
              requestId
            );
          }
        }
      }

      // Parse and validate request body for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json();
          context.body = body;

          // Custom body validation
          if (options.validateBody) {
            options.validateBody(body);
          }
        } catch (error) {
          if (error instanceof AppError) {
            throw error;
          }
          throw new AppError(
            'Invalid JSON in request body',
            ErrorType.VALIDATION,
            400,
            true,
            requestId
          );
        }
      }

      // Execute the handler
      const response = await handler(request, context);

      // Log successful response
      const duration = Date.now() - startTime;
      if (options.logRequests !== false) {
        Logger.info('API Response', {
          requestId,
          status: response.status,
          duration: `${duration}ms`
        });
      }

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);
      
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      Logger.error('API Error', error, {
        requestId,
        method: request.method,
        url: request.url,
        duration: `${duration}ms`
      });

      // Handle and return error response
      const errorResponse = ErrorHandler.handleError(error as Error, requestId);
      errorResponse.headers.set('X-Request-ID', requestId);
      
      return errorResponse;
    }
  };
}

// Specific middleware presets
export const withAuth = (handler: ApiHandler) => 
  withMiddleware(handler, { requireAuth: true });

export const withAdmin = (handler: ApiHandler) => 
  withMiddleware(handler, { requireAuth: true, requireAdmin: true });

export const withRateLimit = (handler: ApiHandler, maxRequests: number = 100) => 
  withMiddleware(handler, { rateLimit: { maxRequests } });

export const withValidation = (handler: ApiHandler, validateBody: (body: any) => void) => 
  withMiddleware(handler, { validateBody });

// Utility functions for common validations
export const validateFactCheckBody = (body: any) => {
  ErrorHandler.validateRequired(body, ['content']);
  ErrorHandler.validateStringLength(body.content, 'content', 1, 10000);
};

export const validateBiasAnalysisBody = (body: any) => {
  ErrorHandler.validateRequired(body, ['content']);
  ErrorHandler.validateStringLength(body.content, 'content', 1, 10000);
};

export const validateProfileBody = (body: any) => {
  if (body.full_name) {
    ErrorHandler.validateStringLength(body.full_name, 'full_name', 1, 100);
  }
  if (body.website) {
    ErrorHandler.validateUrl(body.website);
  }
  if (body.bio) {
    ErrorHandler.validateStringLength(body.bio, 'bio', 0, 500);
  }
};

export const validateSettingsBody = (body: any) => {
  ErrorHandler.validateRequired(body, ['settings']);
  if (typeof body.settings !== 'object') {
    throw new AppError(
      'Settings must be an object',
      ErrorType.VALIDATION,
      400
    );
  }
};

export const validateSubscriptionBody = (body: any) => {
  ErrorHandler.validateRequired(body, ['action']);
  ErrorHandler.validateEnum(
    body.action, 
    'action', 
    ['create', 'upgrade', 'cancel', 'reactivate']
  );
  
  if (['create', 'upgrade'].includes(body.action)) {
    ErrorHandler.validateRequired(body, ['tier']);
    ErrorHandler.validateEnum(body.tier, 'tier', ['pro', 'enterprise']);
  }
};

// Database operation wrapper with error mapping
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    Logger.error(`Database operation failed${context ? ` (${context})` : ''}`, error);
    
    // Map database-specific errors
    if (error.code) {
      switch (error.code) {
        case '23505':
          throw new AppError(
            'Resource already exists',
            ErrorType.VALIDATION,
            409
          );
        case '23503':
          throw new AppError(
            'Referenced resource does not exist',
            ErrorType.VALIDATION,
            400
          );
        case '23514':
          throw new AppError(
            'Invalid data format',
            ErrorType.VALIDATION,
            400
          );
        case 'PGRST116':
          throw new AppError(
            'Resource not found',
            ErrorType.NOT_FOUND,
            404
          );
        default:
          throw new AppError(
            'Database operation failed',
            ErrorType.DATABASE,
            500
          );
      }
    }
    
    throw error;
  }
}

// External API call wrapper
export async function withExternalApiErrorHandling<T>(
  operation: () => Promise<T>,
  serviceName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    Logger.error(`External API call failed (${serviceName})`, error);
    
    if (error.response?.status === 429) {
      throw new AppError(
        `${serviceName} rate limit exceeded`,
        ErrorType.RATE_LIMIT,
        429
      );
    }
    
    if (error.response?.status >= 400 && error.response?.status < 500) {
      throw new AppError(
        `${serviceName} request failed`,
        ErrorType.EXTERNAL_API,
        400
      );
    }
    
    throw new AppError(
      `${serviceName} service unavailable`,
      ErrorType.EXTERNAL_API,
      503
    );
  }
}