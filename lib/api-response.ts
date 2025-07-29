import { NextResponse } from 'next/server';

/**
 * Standardized API response utilities
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    } as ApiResponse<T>,
    { status }
  );
}

/**
 * Create error response
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  code?: string,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
    } as ApiResponse,
    { status }
  );
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any, context: string = 'API'): NextResponse {
  console.error(`${context} Error:`, error);

  if (error.name === 'ZodError') {
    return createErrorResponse(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      error.errors
    );
  }

  if (error.code === 'P2002') {
    return createErrorResponse(
      'A record with this information already exists',
      409,
      'DUPLICATE_ERROR'
    );
  }

  if (error.code === 'P2025') {
    return createErrorResponse(
      'Record not found',
      404,
      'NOT_FOUND'
    );
  }

  return createErrorResponse(
    error.message || 'Internal server error',
    500,
    'INTERNAL_ERROR'
  );
}