import Stripe from 'stripe';

/**
 * Stripe client configuration and utilities
 */

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

/**
 * Create Stripe customer
 */
export async function createStripeCustomer(params: {
  email: string;
  name: string;
  phone?: string;
}): Promise<Stripe.Customer> {
  return await stripe.customers.create({
    email: params.email,
    name: params.name,
    phone: params.phone,
    metadata: {
      created_by: 'billing_portal',
    },
  });
}

/**
 * Create Stripe Checkout Session
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    customer: params.customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    billing_address_collection: 'required',
    allow_promotion_codes: true,
    subscription_data: {
      metadata: params.metadata,
    },
  });
}

/**
 * Create Stripe Customer Portal Session
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
    configuration: {
      business_profile: {
        headline: 'Manage your Singr Karaoke Connect subscription',
      },
      features: {
        payment_method_update: {
          enabled: true,
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'promotion_code'],
          proration_behavior: 'create_prorations',
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
          },
        },
        customer_update: {
          allowed_updates: ['name', 'email', 'address', 'phone', 'tax_id'],
          enabled: true,
        },
        invoice_history: {
          enabled: true,
        },
      },
    },
  });
}

/**
 * Get subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });
}

/**
 * Reactivate subscription
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Update Stripe customer with billing information
 */
export async function updateStripeCustomer(params: {
  customerId: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}): Promise<Stripe.Customer> {
  const updateData: Stripe.CustomerUpdateParams = {};
  
  if (params.name) updateData.name = params.name;
  if (params.email) updateData.email = params.email;
  if (params.phone) updateData.phone = params.phone;
  if (params.address) updateData.address = params.address;

  return await stripe.customers.update(params.customerId, updateData);
}

/**
 * Get Stripe customer details
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer> {
  return await stripe.customers.retrieve(customerId) as Stripe.Customer;
}

/**
 * Create subscription with flexible billing
 */
export async function createFlexibleSubscription(params: {
  customerId: string;
  priceId: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: params.priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
    },
    expand: ['latest_invoice.payment_intent'],
    trial_period_days: params.trialPeriodDays,
    metadata: params.metadata,
    automatic_tax: {
      enabled: true,
    },
    billing_cycle_anchor_config: {
      day_of_month: 1,
    },
  });
}

/**
 * Update subscription with proration
 */
export async function updateSubscriptionWithProration(params: {
  subscriptionId: string;
  newPriceId: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
  
  return await stripe.subscriptions.update(params.subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: params.newPriceId,
    }],
    proration_behavior: params.prorationBehavior || 'create_prorations',
    billing_cycle_anchor: 'unchanged',
  });
}