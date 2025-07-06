import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
    db: { schema: 'public' }
  }
);

// Price mapping with validation (updated with new Stripe products)
const PRICE_ID_TO_TIER = {
  'price_1Rh7kCQYU340CsP0NGbx0Qnj': 'lite',     // £7.99/month - NEW Lite Product
  'price_1Rh7lMQYU340CsP0yJy4VaTu': 'full',     // £14.99/month - NEW Full Product
  // Legacy price IDs (deprecated but kept for safety)
  'price_1RfM4LHlv5z8bwBIcwv3aUkb': 'lite',     // OLD - £7.99/month - Lite (was £9.99)
  'price_1RfM4LHlv5z8bwBIKLFadfjp': 'full',     // OLD - £14.99/month - Full (was £19.99)
  'price_1Rfh1nQYU340CsP0kXM8I05h': 'lite',     // LEGACY
  'price_1RfgxvQYU340CsP0AcrSjH2O': 'full'      // LEGACY
} as const;

// Validate tier type
type ValidTier = 'free' | 'lite' | 'full';
const isValidTier = (tier: string): tier is ValidTier => 
  ['free', 'lite', 'full'].includes(tier);

// Define profile type
interface Profile {
  id: string;
  user_tier: string;
  email: string;
}

// Log tier change in database
async function logTierChange(
  userId: string,
  oldTier: string | null,
  newTier: ValidTier,
  source: 'stripe',
  metadata?: any
) {
  try {
    await supabase.rpc('log_tier_change', {
      p_user_id: userId,
      p_old_tier: oldTier,
      p_new_tier: newTier,
      p_source: source,
      p_metadata: metadata
    });
  } catch (error) {
    console.error('Error logging tier change:', error);
    // Don't throw - this is a non-critical operation
  }
}

// Handle subscription update
async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  customerId: string
) {
  try {
    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id;
    
    if (!priceId || !PRICE_ID_TO_TIER[priceId as keyof typeof PRICE_ID_TO_TIER]) {
      console.error('Invalid price ID:', priceId);
      return;
    }

    const tier = PRICE_ID_TO_TIER[priceId as keyof typeof PRICE_ID_TO_TIER];
    
    // Get customer email
    const customer = await stripe.customers.retrieve(customerId);
    
    if (!customer.deleted && customer.email) {
      // Get current user tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_tier, email')
        .eq('email', customer.email)
        .single();

      if (profile) {
        const oldTier = profile.user_tier;
        const status = subscription.status === 'active' ? 'active' : 'inactive';

        // Update user tier in Supabase
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            user_tier: tier,
            updated_at: new Date().toISOString(),
            stripe_customer_id: customerId,
            subscription_status: status
          })
          .eq('email', customer.email);

        if (updateError) {
          console.error('Error updating user tier:', updateError);
          return;
        }

        // Log the tier change
        await logTierChange(
          profile.id,
          oldTier,
          tier,
          'stripe',
          {
            subscription_id: subscription.id,
            customer_id: customerId,
            price_id: priceId,
            status
          }
        );

        console.log('Successfully processed subscription update:', {
          email: customer.email,
          tier,
          customerId,
          status
        });
      }
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

// Webhook endpoint
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req: express.Request, res: express.Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.error('No Stripe signature found');
      return res.status(400).send('No Stripe signature');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          // Handle both subscription and one-time payments
          if (session.mode === 'subscription') {
            const subscriptionId = session.subscription as string;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await handleSubscriptionUpdate(subscription, session.customer as string);
          } else {
            // One-time payment handling (if needed)
            console.log('One-time payment completed:', session.id);
          }
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdate(subscription, subscription.customer as string);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = subscription.customer as string;
          
          // Get customer email
          const customerData = await stripe.customers.retrieve(customer);
          
          if (!customerData.deleted && customerData.email) {
            // Update user tier to free
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                user_tier: 'free',
                updated_at: new Date().toISOString(),
                subscription_status: 'cancelled'
              })
              .eq('email', customerData.email);

            if (updateError) {
              console.error('Error updating user tier:', updateError);
              return res.status(500).send('Error updating user tier');
            }

            console.log('Successfully cancelled subscription for:', customerData.email);
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).send('Error processing webhook');
    }
  }
);

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'healthy' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Webhook server running on port ${port}`);
}); 