import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/stripe';

/**
 * Create Stripe Checkout Session
 * POST /api/subscriptions/create-session
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return handleApiError(
        new Error('Unauthorized'),
        'Create Checkout Session'
      );
    }
    
    const body = await request.json();
    const { priceId } = body;
    
    if (!priceId) {
      return handleApiError(
        new Error('Price ID is required'),
        'Create Checkout Session'
      );
    }
    
    // Get user's Stripe customer
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId: currentUser.userId },
    });
    
    if (!stripeCustomer) {
      return handleApiError(
        new Error('Stripe customer not found'),
        'Create Checkout Session'
      );
    }
    
    // Create checkout session
    const session = await createCheckoutSession({
      customerId: stripeCustomer.stripeCustomerId,
      priceId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      metadata: {
        userId: currentUser.userId,
      },
    });
    
    return createSuccessResponse({
      sessionId: session.id,
      url: session.url,
    });
    
  } catch (error) {
    return handleApiError(error, 'Create Checkout Session');
  }
}