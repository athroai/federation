# Athro AI Stripe Webhook Server

This server handles Stripe webhook events for the Athro AI subscription system. It processes subscription events and updates user tiers in the Supabase database.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3000
```

3. Apply database migrations:
```bash
npm run migrate
```

4. Build the server:
```bash
npm run build
```

5. Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Endpoints

- `POST /webhook`: Stripe webhook endpoint
- `GET /health`: Health check endpoint

## Security Features

- Request signature verification
- Rate limiting
- CORS protection
- Helmet security headers
- Morgan logging

## Deployment

1. Set up your deployment platform (e.g., Heroku, DigitalOcean, etc.)
2. Configure environment variables
3. Deploy the server
4. Update your Stripe webhook endpoint URL
5. Test the webhook with Stripe's test events

## Monitoring

The server logs all events and errors. Monitor these logs in your deployment platform's logging system.

## Development

1. Use `npm run dev` for local development with hot reload
2. Test webhook locally using Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/webhook
```

## Error Handling

The server includes comprehensive error handling for:
- Invalid signatures
- Database errors
- Rate limiting
- Missing data

## Tier System

- Free Tier: £1.00 API spend limit/month
- Lite Tier (£9.99/month): £3.50 API spend limit
- Premium Tier (£19.99/month): £7.00 API spend limit

## Logging

All tier changes are logged in the `tier_changes` table with:
- User ID
- Old tier
- New tier
- Change source
- Metadata
- Timestamp 