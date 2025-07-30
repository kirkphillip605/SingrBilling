import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, handleApiError } from '@/lib/api-response';
import Stripe from 'stripe';

/**
 * Stripe webhook handler
 * POST /api/subscriptions/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');
    
    if (!signature) {
      return handleApiError(
        new Error('Missing Stripe signature'),
        'Webhook'
      );
    }
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return handleApiError(
        new Error('Invalid signature'),
        'Webhook'
      );
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;
        
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return createSuccessResponse({ received: true });
    
  } catch (error) {
    return handleApiError(error, 'Webhook');
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (!session.subscription || !session.metadata?.userId) {
    console.error('Missing subscription or user ID in checkout session:', {
      subscription: session.subscription,
      userId: session.metadata?.userId,
      sessionId: session.id,
    });
    return;
  }
  
  try {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    // Check if subscription already exists to prevent duplicates
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    
    if (existingSubscription) {
      console.log('Subscription already exists, skipping creation:', subscription.id);
      return;
    }
    
    await prisma.subscription.create({
      data: {
        userId: session.metadata.userId,
        stripeSubscriptionId: subscription.id,
        planInterval: subscription.items.data[0].price.recurring?.interval || 'month',
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
    
    console.log('Subscription created:', subscription.id);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
    
    console.log('Subscription updated after successful payment:', subscription.id);
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  try {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: invoice.subscription as string },
      data: { status: 'past_due' },
    });
    
    console.log('Subscription marked as past due:', invoice.subscription);
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
    
    console.log('Subscription updated:', subscription.id);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: 'canceled' },
    });
    
    console.log('Subscription canceled:', subscription.id);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

/**
 * Handle customer updated (for billing address sync)
 */
async function handleCustomerUpdated(customer: Stripe.Customer) {
  try {
    // Find user by Stripe customer ID
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { stripeCustomerId: customer.id },
      include: { user: true },
    });
    
    if (!stripeCustomer) {
      console.log('Customer not found in database:', customer.id);
      return;
    }
    
    // Update user with billing address from Stripe
    const updateData: any = {};
    
    if (customer.address) {
      updateData.billingAddress = customer.address.line1;
      updateData.city = customer.address.city;
      updateData.state = customer.address.state;
      updateData.zip = customer.address.postal_code;
    }
    
    if (customer.phone && customer.phone !== stripeCustomer.user.phone) {
      updateData.phone = customer.phone;
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: stripeCustomer.userId },
        data: updateData,
      });
      
      console.log('User billing information updated from Stripe:', stripeCustomer.userId);
    }
  } catch (error) {
    console.error('Error handling customer updated:', error);
  }
}

/**
 * Handle payment method attached
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  try {
    if (paymentMethod.customer) {
      console.log('Payment method attached to customer:', paymentMethod.customer);
      // Could add logic to update default payment method if needed
    }
  } catch (error) {
    console.error('Error handling payment method attached:', error);
  }
}