import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { updateProfileSchema } from '@/lib/validations';

/**
 * Get user profile
 * GET /api/user/profile
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return handleApiError(
        new Error('Unauthorized'),
        'Get Profile'
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        businessName: true,
        phone: true,
        email: true,
        billingAddress: true,
        city: true,
        state: true,
        zip: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      return handleApiError(
        new Error('User not found'),
        'Get Profile'
      );
    }
    
    return createSuccessResponse(user);
    
  } catch (error) {
    return handleApiError(error, 'Get Profile');
  }
}

/**
 * Update user profile
 * PUT /api/user/profile
 */
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return handleApiError(
        new Error('Unauthorized'),
        'Update Profile'
      );
    }
    
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);
    
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.userId },
      data: validatedData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        businessName: true,
        phone: true,
        email: true,
        billingAddress: true,
        city: true,
        state: true,
        zip: true,
        updatedAt: true,
      },
    });
    
    // Sync billing address to Stripe if it was updated
    if (validatedData.billingAddress || validatedData.city || validatedData.state || validatedData.zip) {
      try {
        const stripeCustomer = await prisma.stripeCustomer.findUnique({
          where: { userId: currentUser.userId },
        });
        
        if (stripeCustomer) {
          await updateStripeCustomer({
            customerId: stripeCustomer.stripeCustomerId,
            name: `${updatedUser.firstName} ${updatedUser.lastName}`,
            phone: updatedUser.phone || undefined,
            address: {
              line1: updatedUser.billingAddress || undefined,
              city: updatedUser.city || undefined,
              state: updatedUser.state || undefined,
              postal_code: updatedUser.zip || undefined,
              country: 'US',
            },
          });
        }
      } catch (stripeError) {
        console.error('Failed to sync billing address to Stripe:', stripeError);
        // Continue anyway - don't fail the profile update
      }
    }
    
    return createSuccessResponse({
      user: updatedUser,
      message: 'Profile updated successfully',
    });
    
  } catch (error) {
    return handleApiError(error, 'Update Profile');
  }
}