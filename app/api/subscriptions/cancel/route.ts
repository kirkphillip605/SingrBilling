import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { cancelSubscription } from '@/lib/stripe';

/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return handleApiError(
        new Error('Unauthorized'),
        'Cancel Subscription'
      );
    }
    
    const body = await request.json();
    const { subscriptionId, cancelAtPeriodEnd = true } = body;
    
    if (!subscriptionId) {
      return handleApiError(
        new Error('Subscription ID is required'),
        'Cancel Subscription'
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
        'Cancel Subscription'
      );
    }
    
    // Cancel in Stripe
    const updatedSubscription = await cancelSubscription(
      subscription.stripeSubscriptionId,
      cancelAtPeriodEnd
    );
    
    // Update in database
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        status: updatedSubscription.status,
      },
    });
    
    return createSuccessResponse({
      message: cancelAtPeriodEnd 
        ? 'Subscription will be canceled at the end of the current period'
        : 'Subscription canceled immediately',
    });
    
  } catch (error) {
    return handleApiError(error, 'Cancel Subscription');
  }
}