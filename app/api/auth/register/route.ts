import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { registerSchema } from '@/lib/validations';
import { hashPassword, createToken } from '@/lib/auth';
import { createStripeCustomer } from '@/lib/stripe';
import { cookies } from 'next/headers';

/**
 * User registration endpoint
 * POST /api/auth/register
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    
    if (existingUser) {
      return handleApiError(
        new Error('User with this email already exists'),
        'Registration'
      );
    }
    
    // Hash password
    const passwordHash = await hashPassword(validatedData.password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        businessName: validatedData.businessName,
        phone: validatedData.phone,
        email: validatedData.email,
        passwordHash,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        businessName: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });
    
    // Create Stripe customer
    try {
      const stripeCustomer = await createStripeCustomer({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone || undefined,
      });
      
      // Save Stripe customer ID
      await prisma.stripeCustomer.create({
        data: {
          userId: user.id,
          stripeCustomerId: stripeCustomer.id,
        },
      });
    } catch (stripeError) {
      console.error('Failed to create Stripe customer:', stripeError);
      // Continue with registration even if Stripe fails
    }
    
    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
    });
    
    // Set HTTP-only cookie
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    return createSuccessResponse({
      user,
      message: 'Registration successful',
    }, 201);
    
  } catch (error) {
    return handleApiError(error, 'Registration');
  }
}