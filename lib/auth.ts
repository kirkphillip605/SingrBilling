import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

/**
 * Authentication utilities for JWT token management
 */

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const JWT_ALGORITHM = 'HS256';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Create a new JWT token
 */
export async function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Get current user from request cookies
 */
export async function getCurrentUser(request?: NextRequest): Promise<JWTPayload | null> {
  try {
    let token: string | undefined;
    
    if (request) {
      // For API routes and middleware
      token = request.cookies.get('auth-token')?.value;
    } else {
      // For server components
      const cookieStore = cookies();
      token = cookieStore.get('auth-token')?.value;
    }

    if (!token) return null;

    return await verifyToken(token);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate secure random token for password reset
 */
export function generateResetToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}