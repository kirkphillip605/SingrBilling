import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

/**
 * Next.js middleware for route protection and authentication
 */

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/billing', '/profile'];

// Routes that should redirect authenticated users
const authRoutes = ['/login', '/register'];

// Public routes that don't require authentication
const publicRoutes = ['/', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Get current user from token
  const user = await getCurrentUser(request);
  const isAuthenticated = !!user;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users to login for protected routes
  if (!isAuthenticated && protectedRoutes.some(route => pathname.startsWith(route))) {
    const loginUrl = new URL('/login', request.url);
    // Preserve query parameters for intent-based flows
    const redirectUrl = pathname + request.nextUrl.search;
    loginUrl.searchParams.set('redirect', redirectUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};