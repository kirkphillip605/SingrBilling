import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { reactivateSubscription } from '@/lib/stripe';

/**
 * Reactivate subscription
 * POST /api/subscriptions/reactivate
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return handleApiError(
        new Error('Unauthorized'),
        'Reactivate Subscription'
      );
    }
    
    const body = await request.json();
    const { subscriptionId } = body;
    
    if (!subscriptionId) {
      return handleApiError(
        new Error('Subscription ID is required'),
        'Reactivate Subscription'
      );
    }
    
    // Verify subscription belongs to user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId: currentUser.userId,
      },
    });
    
    if (!subscription) {
      return handleApiError(
        new Error('Subscription not found'),
        'Reactivate Subscription'
      );
    }
    
    // Reactivate in Stripe
    const updatedSubscription = await reactivateSubscription(
      subscription.stripeSubscriptionId
    );
    
    // Update in database
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: false,
        status: updatedSubscription.status,
      },
    });
    
    return createSuccessResponse({
      message: 'Subscription reactivated successfully',
    });
    
  } catch (error) {
    return handleApiError(error, 'Reactivate Subscription');
  }
}