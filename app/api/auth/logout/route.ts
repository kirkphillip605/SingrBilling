import { cookies } from 'next/headers';
import { createSuccessResponse } from '@/lib/api-response';

/**
 * User logout endpoint
 * POST /api/auth/logout
 */
export async function POST() {
  // Clear auth cookie
  cookies().set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });
  
  return createSuccessResponse({
    message: 'Logout successful',
  });
}