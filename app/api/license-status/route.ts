import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

/**
 * Check license status
 * GET /api/license-status
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return createSuccessResponse({
        valid: false,
        reason: 'Not authenticated',
      });
    }
    
    // Get active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: currentUser.userId,
        status: {
          in: ['active', 'trialing'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!activeSubscription) {
      return createSuccessResponse({
        valid: false,
        reason: 'No active subscription',
      });
    }
    
    // Check if subscription is not canceled or past due
    const isValid = activeSubscription.status === 'active' || 
                   activeSubscription.status === 'trialing';
    
    return createSuccessResponse({
      valid: isValid,
      expiresAt: activeSubscription.currentPeriodEnd?.toISOString(),
      status: activeSubscription.status,
      planInterval: activeSubscription.planInterval,
    });
    
  } catch (error) {
    return handleApiError(error, 'License Status Check');
  }
}