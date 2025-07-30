import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { createPortalSession } from '@/lib/stripe';

/**
 * Create Stripe Customer Portal Session
 * POST /api/subscriptions/portal
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return handleApiError(
        new Error('Unauthorized'),
        'Create Portal Session'
      );
    }
    
    // Get user's Stripe customer
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId: currentUser.userId },
    });
    
    if (!stripeCustomer) {
      return handleApiError(
        new Error('Stripe customer not found'),
        'Create Portal Session'
      );
    }
    
    // Create portal session
    const session = await createPortalSession({
      customerId: stripeCustomer.stripeCustomerId,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });
    
    return createSuccessResponse({
      url: session.url,
    });
    
  } catch (error) {
    return handleApiError(error, 'Create Portal Session');
  }
}