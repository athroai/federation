import { supabase } from './supabaseClient';

export interface StripeConfig {
  publishableKey: string;
  litePriceId: string;
  premiumPriceId: string;
  successUrl: string;
  cancelUrl: string;
}

export class StripeService {
  private static instance: StripeService;
  private config: StripeConfig;

  // Updated Stripe Buy Button URLs for new pricing
  private readonly buyButtonUrls = {
    lite: 'https://buy.stripe.com/test_6oU5kF3PU9QqbiJdUpew803',     // NEW £7.99/month
    premium: 'https://buy.stripe.com/test_6oUfZj86a7Ii9aBaIdew802',   // NEW £14.99/month
    tokens: 'https://buy.stripe.com/test_6oU4gB86a0fQ0E56rXew804' // £2.00 token pack - 320,000 tokens
  };

  private constructor() {
    this.config = {
      publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
      litePriceId: import.meta.env.VITE_STRIPE_LITE_PRICE_ID || '',
      premiumPriceId: import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID || '',
      successUrl: `${window.location.origin}/upgrade-success`,
      cancelUrl: `${window.location.origin}/upgrade-cancelled`
    };
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  // Get direct Stripe Payment Link URLs
  getPaymentUrl(userId: string, tier: 'lite' | 'premium'): string {
    // ✅ Use the NEW updated Stripe Payment Link URLs from buyButtonUrls
    const baseUrl = this.buyButtonUrls[tier];
    
    if (!baseUrl) {
      throw new Error(`No payment URL configured for tier: ${tier}`);
    }
    
    // Add success and cancel URLs as query parameters
    const successUrl = encodeURIComponent(this.config.successUrl + `?user_id=${userId}&tier=${tier}`);
    const cancelUrl = encodeURIComponent(this.config.cancelUrl);
    
    console.log('🔗 Using payment URL:', baseUrl);
    console.log('🎯 Success URL:', successUrl);
    
    return `${baseUrl}?success_url=${successUrl}&cancel_url=${cancelUrl}`;
  }

  // 🆕 NEW: Token Purchase URL Method (using buy button URL with parameters)
  getTokenPurchaseUrl(userId: string): string {
    // Get the token purchase URL from buyButtonUrls
    const tokenBuyButtonUrl = this.buyButtonUrls.tokens;
    
    if (!tokenBuyButtonUrl || tokenBuyButtonUrl.includes('REPLACE_WITH_YOUR_TOKEN_URL')) {
      console.error('❌ Token purchase URL not configured! Please update buyButtonUrls.tokens in StripeService.ts');
      throw new Error('Token purchase URL not configured. Please update the URL in StripeService.ts');
    }
    
    // Add success and cancel URLs as query parameters - direct to token purchase success page
    const successUrl = encodeURIComponent(`${window.location.origin}/token-purchase-success?session_id={CHECKOUT_SESSION_ID}`);
    const cancelUrl = encodeURIComponent(`${window.location.origin}/dashboard?token_purchase_cancelled=true`);
    
    console.log('🔗 Token purchase URL:', tokenBuyButtonUrl);
    console.log('🎯 Success URL:', successUrl);
    
    return `${tokenBuyButtonUrl}?success_url=${successUrl}&cancel_url=${cancelUrl}`;
  }

  // 🆕 NEW: Token Purchase Method (Edge Function approach - kept for reference)
  async createTokenPurchaseSession(userId: string): Promise<{ url: string; sessionId: string }> {
    try {
      console.log('🛒 Creating token purchase session for user:', userId);
      
      const { data, error } = await supabase.functions.invoke('create-token-checkout-session', {
        body: {
          userId,
          successUrl: `${window.location.origin}/dashboard?tab=subscription&section=usage&token_purchase_success=true`,
          cancelUrl: `${window.location.origin}/dashboard?token_purchase_cancelled=true`
        }
      });

      if (error) {
        console.error('❌ Failed to create token purchase session:', error);
        throw new Error(error.message || 'Failed to create token purchase session');
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      console.log('✅ Token purchase session created successfully');
      
      return {
        url: data.url,
        sessionId: data.sessionId || ''
      };
    } catch (error) {
      console.error('❌ Token purchase session error:', error);
      throw error;
    }
  }

  // 🆕 NEW: Handle Token Purchase Success
  async handleTokenPurchaseSuccess(sessionId: string, userId: string): Promise<void> {
    try {
      console.log('🔍 Processing token purchase success...');
      console.log(`📦 Session ID: ${sessionId}`);
      console.log(`👤 User ID: ${userId}`);

      // The webhook will handle the actual token addition via purchase_extra_tokens()
      // This is just for UI confirmation
      console.log('✅ Token purchase completed - tokens will be added via webhook');
    } catch (error) {
      console.error('Error handling token purchase success:', error);
      throw error;
    }
  }

  async handleSuccessfulPayment(sessionId: string, userId: string, tier: string): Promise<void> {
    try {
      console.log('🔍 Processing successful payment...');
      console.log(`📦 Session ID: ${sessionId}`);
      console.log(`👤 User ID: ${userId}`);
      console.log(`🎯 Tier: ${tier}`);

      // Update user tier directly in database (simple approach)
      const userTier = tier === 'premium' ? 'full' : 'lite';
      
      const { error } = await supabase
        .from('profiles')
        .update({
          user_tier: userTier,
          subscription_start_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update user tier:', error);
        throw new Error('Failed to update subscription');
      }

      console.log(`✅ User tier updated to: ${userTier}`);
    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw error;
    }
  }

  async updateUserTier(userId: string, tier: 'free' | 'lite' | 'full'): Promise<void> {
    try {
      console.log(`🔄 Updating user tier to ${tier} for user ${userId}`);
      
      // Validate tier
      const validTiers = ['free', 'lite', 'full'];
      if (!validTiers.includes(tier)) {
        throw new Error('Invalid tier specified');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          user_tier: tier,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update user tier:', error);
        throw error;
      }

      console.log('✅ User tier updated successfully');
    } catch (error) {
      console.error('Error updating user tier:', error);
      throw error;
    }
  }

  async getUserTier(userId: string): Promise<'free' | 'lite' | 'full'> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_tier, subscription_status, stripe_customer_id')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user tier:', error);
        return 'free';
      }

      // If no subscription data, return free tier
      if (!data.stripe_customer_id || data.subscription_status !== 'active') {
        return 'free';
      }

      // Validate tier
      const validTiers = ['free', 'lite', 'full'];
      if (!validTiers.includes(data.user_tier)) {
        console.error('Invalid tier in database:', data.user_tier);
        return 'free';
      }

      return data.user_tier;
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }

  async cancelSubscription(userId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { userId }
      });

      if (error) {
        console.error('Failed to cancel subscription:', error);
        throw error;
      }
      
      // Update user tier to free (cancelled subscription)
      await this.updateUserTier(userId, 'free');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Get price information for display
  getPriceIds() {
    return {
      lite: this.config.litePriceId,
      premium: this.config.premiumPriceId
    };
  }

  async createCheckoutSession(tier: 'lite' | 'premium', userId: string): Promise<{ url: string }> {
    try {
      console.log('🔄 Creating checkout session for tier:', tier);
      
      // Use new buy button URLs with updated pricing
      const checkoutUrl = this.buyButtonUrls[tier];
      
      if (!checkoutUrl) {
        throw new Error('Invalid tier specified');
      }

      console.log(`✅ Checkout URL for ${tier}:`, checkoutUrl);
      
      return { url: checkoutUrl };
    } catch (error) {
      console.error('❌ Failed to create checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }
}

export const stripeService = StripeService.getInstance(); 