import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { updateStripeCustomer, getStripeCustomer } from '@/lib/stripe';

/**
 * Sync billing address between database and Stripe
 * POST /api/user/sync-billing
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return handleApiError(
        new Error('Unauthorized'),
        'Sync Billing'
      );
    }
    
    const body = await request.json();
    const { direction = 'to_stripe' } = body; // 'to_stripe' or 'from_stripe'
    
    // Get user and Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      include: { customer: true },
    });
    
    if (!user?.customer) {
      return handleApiError(
        new Error('Stripe customer not found'),
        'Sync Billing'
      );
    }
    
    if (direction === 'to_stripe') {
      // Sync from database to Stripe
      await updateStripeCustomer({
        customerId: user.customer.stripeCustomerId,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone || undefined,
        address: user.billingAddress ? {
          line1: user.billingAddress,
          city: user.city || undefined,
          state: user.state || undefined,
          postal_code: user.zip || undefined,
          country: 'US', // Default to US, could be made configurable
        } : undefined,
      });
      
      return createSuccessResponse({
        message: 'Billing information synced to Stripe successfully',
      });
      
    } else if (direction === 'from_stripe') {
      // Sync from Stripe to database
      const stripeCustomer = await getStripeCustomer(user.customer.stripeCustomerId);
      
      const updateData: any = {};
      
      if (stripeCustomer.address) {
        updateData.billingAddress = stripeCustomer.address.line1;
        updateData.city = stripeCustomer.address.city;
        updateData.state = stripeCustomer.address.state;
        updateData.zip = stripeCustomer.address.postal_code;
      }
      
      if (stripeCustomer.phone && stripeCustomer.phone !== user.phone) {
        updateData.phone = stripeCustomer.phone;
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
      
      return createSuccessResponse({
        message: 'Billing information synced from Stripe successfully',
        updatedFields: Object.keys(updateData),
      });
    }
    
    return handleApiError(
      new Error('Invalid direction parameter'),
      'Sync Billing'
    );
    
  } catch (error) {
    return handleApiError(error, 'Sync Billing');
  }
}