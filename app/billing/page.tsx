'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle,
  Star,
  CreditCard,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with proper error handling
const getStripePromise = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured');
    return null;
  }
  return loadStripe(publishableKey);
};

const stripePromise = getStripePromise();

interface Plan {
  id: string;
  name: string;
  interval: string;
  amountCents: number;
  description?: string;
  features: string[];
  popular: boolean;
  stripePriceId: string;
}

interface Subscription {
  id: string;
  planInterval: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

/**
 * Billing page for subscription management and plan selection
 */
export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchBillingData();
    
    // Handle Stripe redirect success
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription created successfully!');
    }
    
    if (searchParams.get('canceled') === 'true') {
      toast.error('Subscription creation was canceled');
    }
  }, [searchParams]);

  const fetchBillingData = async () => {
    try {
      const [plansResponse, subscriptionsResponse] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/subscriptions'),
      ]);

      const [plansResult, subscriptionsResult] = await Promise.all([
        plansResponse.json(),
        subscriptionsResponse.json(),
      ]);

      if (plansResult.success) {
        setPlans(plansResult.data);
      }

      if (subscriptionsResult.success) {
        setSubscriptions(subscriptionsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string, planId: string) => {
    setIsProcessing(planId);

    // Check if Stripe is properly configured
    if (!stripePromise) {
      toast.error('Payment system is not properly configured. Please contact support.');
      setIsProcessing(null);
      return;
    }

    try {
      const response = await fetch('/api/subscriptions/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      const result = await response.json();

      if (result.success) {
        const stripe = await stripePromise;
        if (stripe && result.data.sessionId) {
          const { error } = await stripe.redirectToCheckout({
            sessionId: result.data.sessionId,
          });

          if (error) {
            console.error('Stripe error:', error);
            toast.error('Failed to redirect to checkout');
          }
        } else {
          toast.error('Payment system initialization failed');
        }
      } else {
        toast.error(result.error?.message || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Subscription will be canceled at the end of the current period');
        fetchBillingData(); // Refresh data
      } else {
        toast.error(result.error?.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Subscription reactivated successfully');
        fetchBillingData(); // Refresh data
      } else {
        toast.error(result.error?.message || 'Failed to reactivate subscription');
      }
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const formatPrice = (amountCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amountCents / 100);
  };

  const activeSubscription = subscriptions.find(sub => 
    sub.status === 'active' || sub.status === 'trialing'
  );

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="outline" className="text-orange-600 border-orange-300">Canceling</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="outline" className="text-gray-600">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscriptions</h1>
          <p className="mt-2 text-gray-600">
            Manage your Singr Karaoke Connect subscription and billing information.
          </p>
        </div>

        {/* Current Subscription */}
        {activeSubscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Current Subscription
              </CardTitle>
              <CardDescription>
                Your active subscription details and management options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold capitalize">
                    {activeSubscription.planInterval} Plan
                  </h3>
                  <p className="text-gray-600">
                    Next billing: {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
                {getStatusBadge(activeSubscription.status, activeSubscription.cancelAtPeriodEnd)}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {activeSubscription.cancelAtPeriodEnd ? (
                  <Button
                    onClick={() => handleReactivateSubscription(activeSubscription.id)}
                    variant="default"
                  >
                    Reactivate Subscription
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCancelSubscription(activeSubscription.id)}
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Cancel Subscription
                  </Button>
                )}
                <Button variant="outline">
                  Update Payment Method
                </Button>
              </div>

              {activeSubscription.cancelAtPeriodEnd && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
                    <p className="text-orange-800">
                      Your subscription will be canceled on{' '}
                      {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}.
                      You'll continue to have access until then.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {activeSubscription ? 'Available Plans' : 'Choose Your Plan'}
          </h2>
          <p className="text-gray-600 mb-8">
            Select the billing cycle that works best for your venue. All plans include full access to Singr Karaoke Connect.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular 
                    ? 'ring-2 ring-blue-500 shadow-lg' 
                    : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      {formatPrice(plan.amountCents)}
                    </span>
                    <span className="text-gray-600">/{plan.interval}</span>
                  </div>
                  {plan.description && (
                    <CardDescription className="mt-2">
                      {plan.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.stripePriceId, plan.id)}
                    disabled={isProcessing === plan.id}
                  >
                    {isProcessing === plan.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {activeSubscription && activeSubscription.planInterval === plan.interval
                      ? 'Current Plan'
                      : 'Select Plan'
                    }
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Billing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>
              Secure payment processing powered by Stripe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>SSL encrypted and PCI DSS compliant</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Cancel anytime with no hidden fees</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Automatic invoicing and receipt generation</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}