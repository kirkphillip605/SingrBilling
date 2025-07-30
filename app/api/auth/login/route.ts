import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { loginSchema } from '@/lib/validations';
import { verifyPassword, createToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * User login endpoint
 * POST /api/auth/login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        businessName: true,
        phone: true,
        email: true,
        passwordHash: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      return handleApiError(
        new Error('Invalid email or password'),
        'Login'
      );
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(
      validatedData.password,
      user.passwordHash
    );
    
    if (!isValidPassword) {
      return handleApiError(
        new Error('Invalid email or password'),
        'Login'
      );
    }
    
    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
    });
    
    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    // Return user data (excluding password hash)
    const { passwordHash, ...userData } = user;
    
    return createSuccessResponse({
      user: userData,
      message: 'Login successful',
    });
    
  } catch (error) {
    return handleApiError(error, 'Login');
  }
}