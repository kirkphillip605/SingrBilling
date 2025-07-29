# Billing Portal - Production-Ready Web Application

A comprehensive, secure, and responsive billing portal built with Next.js, TypeScript, and Stripe for subscription management.

## 🚀 Features

### Authentication & Security
- JWT-based authentication with HTTP-only cookies
- Secure password hashing with bcrypt
- Password reset functionality via email
- Protected routes with middleware
- CSRF protection and secure headers

### Subscription Management
- Multiple billing cycles (monthly, quarterly, semi-annual, annual)
- Stripe Checkout integration for payments
- Subscription lifecycle management
- Cancel/reactivate subscriptions
- Real-time webhook processing

### User Experience
- Mobile-first responsive design
- Accessible UI components with Radix
- Comprehensive error handling
- Loading states and user feedback
- Clean, modern interface

### Developer Experience
- TypeScript throughout
- Prisma ORM with PostgreSQL
- Comprehensive API documentation
- Structured error handling
- Environment-based configuration

## 🛠 Tech Stack

### Frontend
- **Next.js 13** - App Router with server components
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling with mobile-first approach
- **Radix UI** - Accessible, headless components
- **React Hook Form** - Form validation and management
- **Zod** - Schema validation

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Primary database
- **JWT (jose)** - Secure authentication tokens
- **bcrypt** - Password hashing

### External Services
- **Stripe** - Payment processing and subscription management
- **Mailjet** - Transactional email service

## 🏗 Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── subscriptions/# Subscription management
│   │   ├── plans/        # Plan management
│   │   └── user/         # User profile endpoints
│   ├── dashboard/        # Dashboard page
│   ├── billing/          # Billing management page
│   ├── login/           # Login page
│   ├── register/        # Registration page
│   └── layout.tsx       # Root layout
├── components/           # Reusable components
│   ├── ui/              # UI component library
│   └── dashboard-layout.tsx
├── lib/                 # Utility libraries
│   ├── auth.ts          # Authentication utilities
│   ├── stripe.ts        # Stripe integration
│   ├── email.ts         # Email service
│   ├── prisma.ts        # Database client
│   ├── validations.ts   # Zod schemas
│   └── api-response.ts  # API response utilities
├── prisma/             # Database schema and migrations
│   └── schema.prisma   # Prisma schema
└── middleware.ts       # Next.js middleware for route protection
```

## 📊 Database Schema

### Core Models
- **User** - User accounts with profile information
- **PasswordResetToken** - Secure password reset tokens
- **StripeCustomer** - Stripe customer relationship
- **Subscription** - User subscriptions with status tracking
- **Plan** - Available subscription plans

## 🔧 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Stripe account
- Mailjet account (for emails)

### 1. Environment Configuration

Create `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/billing_portal"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (Mailjet)
MAILJET_API_KEY="your_mailjet_api_key"
MAILJET_SECRET_KEY="your_mailjet_secret_key"
FROM_EMAIL="noreply@yourdomain.com"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations (recommended for production)
npm run db:migrate
```

### 3. Stripe Configuration

1. Create products and prices in your Stripe Dashboard
2. Add the price IDs to your Plans table:

```sql
INSERT INTO plans (id, stripe_price_id, name, interval, amount_cents, features, popular) VALUES
('monthly', 'price_monthly_id', 'Monthly', 'month', 2900, '["Full access", "Email support", "Basic analytics"]', false),
('quarterly', 'price_quarterly_id', 'Quarterly', 'quarter', 2500, '["Full access", "Priority support", "Advanced analytics", "15% savings"]', true),
('semiannual', 'price_semiannual_id', 'Semi-Annual', 'semiannual', 2200, '["Full access", "Priority support", "Advanced analytics", "25% savings"]', false),
('annual', 'price_annual_id', 'Annual', 'year', 1900, '["Full access", "Priority support", "Advanced analytics", "35% savings"]', false);
```

3. **CRITICAL: Set up Stripe Webhook**
   - Go to your [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"
   - Enter this URL: `https://billing.singrkaraoke.com/api/subscriptions/webhook`
   - Select these events to listen for:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Click "Add endpoint"
   - Copy the "Signing secret" (starts with `whsec_`) and set it as `STRIPE_WEBHOOK_SECRET` in your environment variables

### 4. Development

```bash
# Start development server
npm run dev

# Open Prisma Studio (optional)
npm run db:studio
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/password-reset/request` - Request password reset
- `POST /api/auth/password-reset/confirm` - Confirm password reset

### Subscriptions
- `GET /api/subscriptions` - Get user subscriptions
- `POST /api/subscriptions/create-session` - Create Stripe checkout session
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/reactivate` - Reactivate subscription
- `POST /api/subscriptions/webhook` - Stripe webhook handler

### Plans & Users
- `GET /api/plans` - Get available plans
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/license-status` - Check license validity

## 🔒 Security Features

- **Authentication**: JWT tokens in HTTP-only cookies
- **Authorization**: Route-level protection with middleware
- **Password Security**: bcrypt hashing with salt rounds
- **Input Validation**: Zod schemas for all inputs
- **CSRF Protection**: Built-in Next.js protection
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **Rate Limiting**: Can be added with libraries like `next-rate-limit`

## 📱 Mobile Responsiveness

- Mobile-first Tailwind CSS approach
- Responsive navigation with drawer menu
- Touch-friendly button sizes and spacing
- Optimized forms for mobile input
- Responsive data tables and cards

## 🚀 Deployment

### Vercel (Recommended for Frontend)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Database Hosting
- **Supabase** - PostgreSQL with built-in features
- **PlanetScale** - Serverless MySQL alternative
- **AWS RDS** - Managed PostgreSQL
- **Heroku Postgres** - Simple PostgreSQL hosting

### Production Checklist
- [ ] Set secure JWT secrets
- [ ] Configure production Stripe keys
- [ ] Set up domain for webhooks
- [ ] Configure email service
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Set up SSL certificates
- [ ] Review CORS settings

## 🧪 Testing

```bash
# Run type checking
npx tsc --noEmit

# Run linting
npm run lint

# Run tests (add test script as needed)
npm test
```

## 📝 License

This project is private and proprietary. All rights reserved.

## 🤝 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Note**: This is a production-ready application with enterprise-level security and scalability considerations. Make sure to review all configurations and customize them according to your specific business requirements.