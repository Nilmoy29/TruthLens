import { NextResponse } from 'next/server';

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  DATABASE = 'DATABASE_ERROR',
  INTERNAL = 'INTERNAL_ERROR'
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    isOperational: boolean = true,
    requestId?: string
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    message: string;
    type: string;
    timestamp: string;
    requestId?: string;
    details?: any;
  };
}

// Logger utility
export class Logger {
  private static formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  static info(message: string, meta?: any): void {
    console.log(this.formatMessage('info', message, meta));
  }

  static warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  static error(message: string, error?: Error | any, meta?: any): void {
    const errorMeta = {
      ...meta,
      ...(error && {
        stack: error.stack,
        name: error.name,
        ...(error instanceof AppError && {
          type: error.type,
          statusCode: error.statusCode,
          isOperational: error.isOperational,
          requestId: error.requestId
        })
      })
    };
    console.error(this.formatMessage('error', message, errorMeta));
  }

  static debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

// Error handler utility
export class ErrorHandler {
  static handleError(error: Error | AppError, requestId?: string): NextResponse<ErrorResponse> {
    Logger.error('API Error occurred', error, { requestId });

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            message: error.message,
            type: error.type,
            timestamp: error.timestamp,
            requestId: error.requestId || requestId
          }
        },
        { status: error.statusCode }
      );
    }

    // Handle known error types
    if (error.message.includes('JWT')) {
      return this.createErrorResponse(
        'Invalid or expired authentication token',
        ErrorType.AUTHENTICATION,
        401,
        requestId
      );
    }

    if (error.message.includes('PGRST301')) {
      return this.createErrorResponse(
        'Database constraint violation',
        ErrorType.VALIDATION,
        400,
        requestId
      );
    }

    if (error.message.includes('PGRST116')) {
      return this.createErrorResponse(
        'Resource not found',
        ErrorType.NOT_FOUND,
        404,
        requestId
      );
    }

    if (error.message.includes('rate limit')) {
      return this.createErrorResponse(
        'Rate limit exceeded',
        ErrorType.RATE_LIMIT,
        429,
        requestId
      );
    }

    // Default internal server error
    return this.createErrorResponse(
      'An unexpected error occurred',
      ErrorType.INTERNAL,
      500,
      requestId
    );
  }

  private static createErrorResponse(
    message: string,
    type: ErrorType,
    statusCode: number,
    requestId?: string
  ): NextResponse<ErrorResponse> {
    return NextResponse.json(
      {
        error: {
          message,
          type,
          timestamp: new Date().toISOString(),
          requestId
        }
      },
      { status: statusCode }
    );
  }

  // Validation helpers
  static validateRequired(fields: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      fields[field] === undefined || fields[field] === null || fields[field] === ''
    );

    if (missingFields.length > 0) {
      throw new AppError(
        `Missing required fields: ${missingFields.join(', ')}`,
        ErrorType.VALIDATION,
        400
      );
    }
  }

  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(
        'Invalid email format',
        ErrorType.VALIDATION,
        400
      );
    }
  }

  static validateUrl(url: string): void {
    try {
      new URL(url);
    } catch {
      throw new AppError(
        'Invalid URL format',
        ErrorType.VALIDATION,
        400
      );
    }
  }

  static validateStringLength(value: string, field: string, min: number, max: number): void {
    if (value.length < min || value.length > max) {
      throw new AppError(
        `${field} must be between ${min} and ${max} characters`,
        ErrorType.VALIDATION,
        400
      );
    }
  }

  static validateEnum(value: string, field: string, allowedValues: string[]): void {
    if (!allowedValues.includes(value)) {
      throw new AppError(
        `${field} must be one of: ${allowedValues.join(', ')}`,
        ErrorType.VALIDATION,
        400
      );
    }
  }

  static validateNumber(value: any, field: string, min?: number, max?: number): void {
    const num = Number(value);
    if (isNaN(num)) {
      throw new AppError(
        `${field} must be a valid number`,
        ErrorType.VALIDATION,
        400
      );
    }

    if (min !== undefined && num < min) {
      throw new AppError(
        `${field} must be at least ${min}`,
        ErrorType.VALIDATION,
        400
      );
    }

    if (max !== undefined && num > max) {
      throw new AppError(
        `${field} must be at most ${max}`,
        ErrorType.VALIDATION,
        400
      );
    }
  }
}

// Rate limiting utility
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  private static readonly WINDOW_MS = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS = 100; // per window

  static checkRateLimit(identifier: string, maxRequests: number = this.MAX_REQUESTS): void {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;

    // Clean up old entries
    for (const [key, value] of this.requests.entries()) {
      if (value.resetTime < now) {
        this.requests.delete(key);
      }
    }

    const current = this.requests.get(identifier);
    
    if (!current) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.WINDOW_MS
      });
      return;
    }

    if (current.count >= maxRequests) {
      throw new AppError(
        'Rate limit exceeded. Please try again later.',
        ErrorType.RATE_LIMIT,
        429
      );
    }

    current.count++;
  }
}

// Request ID generator
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Async error wrapper
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      Logger.error('Async operation failed', error);
      throw error;
    }
  };
}

// Database error mapper
export function mapDatabaseError(error: any): AppError {
  if (error.code === '23505') { // Unique constraint violation
    return new AppError(
      'Resource already exists',
      ErrorType.VALIDATION,
      409
    );
  }

  if (error.code === '23503') { // Foreign key constraint violation
    return new AppError(
      'Referenced resource does not exist',
      ErrorType.VALIDATION,
      400
    );
  }

  if (error.code === '23514') { // Check constraint violation
    return new AppError(
      'Invalid data format',
      ErrorType.VALIDATION,
      400
    );
  }

  return new AppError(
    'Database operation failed',
    ErrorType.DATABASE,
    500
  );
}