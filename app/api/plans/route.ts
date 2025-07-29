import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

/**
 * Get all available plans
 * GET /api/plans
 */
export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { amountCents: 'asc' },
    });
    
    return createSuccessResponse(plans);
  } catch (error) {
    return handleApiError(error, 'Get Plans');
  }
}