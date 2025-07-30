import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { updateSubscriptionWithProration } from '@/lib/stripe';

/**
 * Update subscription plan
 * POST /api/subscriptions/update-plan
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return handleApiError(
        new Error('Unauthorized'),
        'Update Subscription Plan'
      );
    }
    
    const body = await request.json();
    const { subscriptionId, newPriceId, prorationBehavior = 'create_prorations' } = body;
    
    if (!subscriptionId || !newPriceId) {
      return handleApiError(
        new Error('Subscription ID and new price ID are required'),
        'Update Subscription Plan'
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
        'Update Subscription Plan'
      );
    }
    
    // Update subscription in Stripe
    const updatedSubscription = await updateSubscriptionWithProration({
      subscriptionId: subscription.stripeSubscriptionId,
      newPriceId,
      prorationBehavior,
    });
    
    // Update in database
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: updatedSubscription.status,
        currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
      },
    });
    
    return createSuccessResponse({
      message: 'Subscription plan updated successfully',
      subscription: updatedSubscription,
    });
    
  } catch (error) {
    return handleApiError(error, 'Update Subscription Plan');
  }
}