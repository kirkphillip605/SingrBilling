import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

/**
 * Get user's subscriptions
 * GET /api/subscriptions
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return handleApiError(
        new Error('Unauthorized'),
        'Get Subscriptions'
      );
    }
    
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: currentUser.userId },
      orderBy: { createdAt: 'desc' },
    });
    
    return createSuccessResponse(subscriptions);
    
  } catch (error) {
    return handleApiError(error, 'Get Subscriptions');
  }
}