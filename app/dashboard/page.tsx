'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

interface Subscription {
  id: string;
  planInterval: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface User {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Dashboard page showing subscription overview and quick actions
 */
export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [userResponse, subscriptionsResponse] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/subscriptions'),
      ]);

      const [userResult, subscriptionsResult] = await Promise.all([
        userResponse.json(),
        subscriptionsResponse.json(),
      ]);

      if (userResult.success) {
        setUser(userResult.data);
      }

      if (subscriptionsResult.success) {
        setSubscriptions(subscriptionsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
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

  const getStatusIcon = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Clock className="h-5 w-5 text-orange-500" />;
    }
    
    switch (status) {
      case 'active':
      case 'trialing':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'past_due':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatPlanInterval = (interval: string) => {
    const intervalMap: Record<string, string> = {
      month: 'Monthly',
      quarter: 'Quarterly',
      semiannual: 'Semi-Annual',
      year: 'Annual',
    };
    return intervalMap[interval] || interval;
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
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-2 text-gray-600">
            Here's an overview of your Singr Karaoke Connect subscription and account status.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription Status</CardTitle>
              {activeSubscription && getStatusIcon(activeSubscription.status, activeSubscription.cancelAtPeriodEnd)}
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {activeSubscription ? (
                  getStatusBadge(activeSubscription.status, activeSubscription.cancelAtPeriodEnd)
                ) : (
                  <Badge variant="outline" className="text-gray-600">No Active Plan</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeSubscription ? formatPlanInterval(activeSubscription.planInterval) : 'No Plan'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Billing Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeSubscription && activeSubscription.currentPeriodEnd ? (
                  format(new Date(activeSubscription.currentPeriodEnd), 'MMM dd, yyyy')
                ) : (
                  'N/A'
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Details */}
        {activeSubscription ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Current Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Billing Cycle</h4>
                  <p className="text-gray-600">{formatPlanInterval(activeSubscription.planInterval)}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Status</h4>
                  <div className="mt-1">
                    {getStatusBadge(activeSubscription.status, activeSubscription.cancelAtPeriodEnd)}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Current Period</h4>
                  <p className="text-gray-600">
                    {format(new Date(activeSubscription.currentPeriodStart), 'MMM dd, yyyy')} - {' '}
                    {format(new Date(activeSubscription.currentPeriodEnd), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Auto-Renewal</h4>
                  <p className="text-gray-600">
                    {activeSubscription.cancelAtPeriodEnd ? 'Disabled' : 'Enabled'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button asChild>
                  <Link href="/billing">Manage Billing</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/profile">Update Profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Active Subscription</CardTitle>
              <CardDescription>
                You don't have an active subscription. Choose a plan to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/billing">Choose a Plan</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your recent billing and account activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length > 0 ? (
              <div className="space-y-4">
                {subscriptions.slice(0, 3).map((subscription) => (
                  <div key={subscription.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">
                        {formatPlanInterval(subscription.planInterval)} Subscription
                      </p>
                      <p className="text-sm text-gray-600">
                        Created {format(new Date(subscription.currentPeriodStart), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    {getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}