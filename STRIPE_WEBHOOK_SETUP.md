# Stripe Webhook Configuration Guide

## Step-by-Step Webhook Setup

### 1. Access Stripe Dashboard
1. Log into your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Click **"Add endpoint"**

### 2. Configure Webhook Endpoint
- **Endpoint URL**: `https://billing.singrkaraoke.com/api/subscriptions/webhook`
- **Description**: "Billing Portal Subscription Events"
- **API Version**: Use the latest version (recommended)

### 3. Select Events to Listen For
Add these specific events that your billing portal needs:

```
✅ checkout.session.completed
✅ invoice.payment_succeeded  
✅ invoice.payment_failed
✅ customer.subscription.updated
✅ customer.subscription.deleted
```

**Important**: Only select these events to avoid unnecessary webhook calls and potential issues.

### 4. Get Your Webhook Secret
1. After creating the webhook, click on it in your webhook list
2. In the webhook details page, find the **"Signing secret"** section
3. Click **"Reveal"** to show the secret
4. Copy the secret (it starts with `whsec_`)
5. Add this to your environment variables as `STRIPE_WEBHOOK_SECRET`

### 5. Environment Variable Setup
Add to your `.env.local` file:
```env
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
```

### 6. Test the Webhook
1. In your Stripe Dashboard, go to the webhook you created
2. Click **"Send test webhook"**
3. Select `checkout.session.completed` as a test event
4. Click **"Send test webhook"**
5. Check your application logs to ensure the webhook is received

### 7. Production Considerations
- **SSL Required**: Webhooks only work with HTTPS endpoints
- **Webhook Signing**: Always verify webhook signatures for security
- **Idempotency**: Handle duplicate webhook events gracefully
- **Timeouts**: Stripe expects a 2xx response within 20 seconds

### Troubleshooting
- **404 Errors**: Ensure your domain is properly deployed and accessible
- **401/403 Errors**: Check that webhook signature verification is working
- **Timeout Errors**: Optimize your webhook handler for quick responses
- **Duplicate Events**: Implement idempotency using Stripe's event IDs

### Webhook Endpoint Details
Your webhook handler is located at:
- **File**: `app/api/subscriptions/webhook/route.ts`
- **URL**: `https://billing.singrkaraoke.com/api/subscriptions/webhook`
- **Method**: POST
- **Authentication**: Stripe signature verification

The handler automatically:
- Verifies webhook signatures
- Creates/updates subscriptions in your database
- Handles payment success/failure events
- Manages subscription lifecycle changes