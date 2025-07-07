/**
 * ✅ ATHRO AI SUBSCRIPTION SERVICE
 * 
 * Handles all subscription logic, tier checking, and access control
 * Updated for new monthly token-based SaaS model
 */

import { getSupabaseClient } from './supabaseClient';
import { TokenMeterService, ModelType } from './TokenMeterService';

export interface UserSubscription {
  userId: string;
  tier: 'free' | 'lite' | 'full';
  spentThisMonthGBP: number;
  lastActivityResetDate: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

export interface UsageCheck {
  success: boolean;
  canProceed: boolean;
  error?: string;
  currentSpendGBP: number;
  monthlyLimitGBP: number;
  remainingGBP: number;
  remainingTokens: number;
  tier: 'free' | 'lite' | 'full';
  requiresUpgrade?: boolean;
  lockoutType?: 'full_app' | 'workspace_only' | null;
  isLowTokenWarning?: boolean;
}

export interface TierLimits {
  monthlySpendLimitGBP: number;
  monthlyTokenLimit: number;
  hasWorkspaceAccess: boolean;
  hasDashboardAccess: boolean;
  description: string;
  price: string;
  features: string[];
}

export class SubscriptionService {
  private supabase: any;
  private tokenMeter: TokenMeterService;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = getSupabaseClient();
      this.tokenMeter = new TokenMeterService(supabaseUrl, supabaseKey);
    } else {
      this.supabase = getSupabaseClient();
      this.tokenMeter = new TokenMeterService();
    }
  }

  /**
   * 🎯 NEW USER-FACING TIER LIMITS
   * These are the ONLY prices shown to users
   */
  getTierLimits(tier: 'free' | 'lite' | 'full'): TierLimits {
    switch (tier) {
      case 'free':
        return {
          monthlySpendLimitGBP: 50.00,      // Internal budget (hidden from users)
          monthlyTokenLimit: 100000,        // 100,000 tokens/month
          hasWorkspaceAccess: true,         
          hasDashboardAccess: true,         
          description: 'Free tier with generous token allocation',
          price: 'Free',                    // USER-FACING PRICE
          features: [
            '100,000 tokens per month',
            'Full workspace access',
            'Full dashboard access', 
            'AI study assistance',
            'Basic quiz generation'
          ]
        };
      
      case 'lite':
        return {
          monthlySpendLimitGBP: 500.00,     // Internal budget (hidden from users)
          monthlyTokenLimit: 1000000,       // 1,000,000 tokens/month
          hasWorkspaceAccess: true,         
          hasDashboardAccess: true,         
          description: 'Lite plan with expanded token allocation',
          price: '£7.99/month',             // USER-FACING PRICE
          features: [
            '1,000,000 tokens per month',
            'Full workspace access',
            'Full dashboard access',
            'Advanced AI features',
            'Priority quiz generation',
            'Progress tracking'
          ]
        };
      
      case 'full':
        return {
          monthlySpendLimitGBP: 800.00,     // Internal budget (hidden from users)
          monthlyTokenLimit: 1602000,       // 1,602,000 tokens/month
          hasWorkspaceAccess: true,         
          hasDashboardAccess: true,         
          description: 'AthroAi: Full access with token top-up option',
          price: '£14.99/month',            // USER-FACING PRICE
          features: [
            '1,602,000 tokens per month',
            'Full workspace access',
            'Full dashboard access',
            'All premium features',
            'Premium quiz generation',
            'Token top-ups available: £2.00 per pack',
            'Priority support'
          ]
        };
      
      default:
        return this.getTierLimits('free');
    }
  }

  /**
   * Get user subscription details
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    if (!this.supabase) {
      console.warn('Supabase not initialized');
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select(`
          id,
          user_tier,
          spent_today_gbp,
          last_activity_reset_date,
          subscription_start_date,
          subscription_end_date
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user subscription:', error);
        return null;
      }

      return {
        userId: data.id,
        tier: data.user_tier || 'free',
        spentThisMonthGBP: data.spent_today_gbp || 0, // Note: Will be renamed to spent_this_month_gbp
        lastActivityResetDate: data.last_activity_reset_date,
        subscriptionStartDate: data.subscription_start_date,
        subscriptionEndDate: data.subscription_end_date
      };
    } catch (error) {
      console.error('Failed to fetch user subscription:', error);
      return null;
    }
  }

  /**
   * CRITICAL: Quiz model enforcement before usage check
   */
  async checkQuizUsage(
    userId: string,
    estimatedInputTokens: number
  ): Promise<UsageCheck> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      return {
        success: false,
        canProceed: false,
        error: 'Subscription not found',
        currentSpendGBP: 0,
        monthlyLimitGBP: 0,
        remainingGBP: 0,
        remainingTokens: 0,
        tier: 'free'
      };
    }

    // ENFORCE: All quizzes MUST use GPT-4.1 (gpt-4o)
    const usageCheck = await this.tokenMeter.canMakeAPICall(
      userId,
      'gpt-4o', // ALWAYS GPT-4.1 for quizzes
      estimatedInputTokens,
      subscription.tier
    );

    const limits = this.getTierLimits(subscription.tier);

    if (!usageCheck.canProceed) {
      return {
        success: false,
        canProceed: false,
        error: 'Insufficient tokens for quiz generation. Upgrade required.',
        currentSpendGBP: limits.monthlySpendLimitGBP - usageCheck.remainingBudgetGBP,
        monthlyLimitGBP: limits.monthlySpendLimitGBP,
        remainingGBP: usageCheck.remainingBudgetGBP,
        remainingTokens: usageCheck.remainingTokens,
        tier: subscription.tier,
        requiresUpgrade: true,
        lockoutType: 'full_app' // Block quiz generation completely
      };
    }

    return {
      success: true,
      canProceed: true,
      currentSpendGBP: limits.monthlySpendLimitGBP - usageCheck.remainingBudgetGBP,
      monthlyLimitGBP: limits.monthlySpendLimitGBP,
      remainingGBP: usageCheck.remainingBudgetGBP,
      remainingTokens: usageCheck.remainingTokens,
      tier: subscription.tier,
      isLowTokenWarning: usageCheck.isLowTokenWarning
    };
  }

  /**
   * Check if user can proceed with an action (before usage)
   */
  async checkUsageBeforeAction(
    userId: string, 
    model: ModelType,
    estimatedInputTokens: number
  ): Promise<UsageCheck> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      return {
        success: false,
        canProceed: false,
        error: 'Subscription not found',
        currentSpendGBP: 0,
        monthlyLimitGBP: 0,
        remainingGBP: 0,
        remainingTokens: 0,
        tier: 'free'
      };
    }

    const limits = this.getTierLimits(subscription.tier);
    
    // Use TokenMeterService to check if call is allowed
    const usageCheck = await this.tokenMeter.canMakeAPICall(
      userId,
      model,
      estimatedInputTokens,
      subscription.tier
    );

    return {
      success: true,
      canProceed: usageCheck.canProceed,
      error: usageCheck.reason,
      currentSpendGBP: limits.monthlySpendLimitGBP - usageCheck.remainingBudgetGBP,
      monthlyLimitGBP: limits.monthlySpendLimitGBP,
      remainingGBP: usageCheck.remainingBudgetGBP,
      remainingTokens: usageCheck.remainingTokens,
      tier: subscription.tier,
      requiresUpgrade: !usageCheck.canProceed,
      lockoutType: this.determineLockoutType(subscription.tier, usageCheck.canProceed),
      isLowTokenWarning: usageCheck.isLowTokenWarning
    };
  }

  /**
   * Record actual usage after an action
   */
  async recordUsage(
    userId: string,
    model: ModelType,
    inputTokens: number,
    outputTokens: number
  ): Promise<UsageCheck> {
    // Record usage in TokenMeterService
    await this.tokenMeter.recordUsage(userId, model, inputTokens, outputTokens);
    
    // Return updated usage check
    return this.checkUsageBeforeAction(userId, model, 0);
  }

  /**
   * Determine lockout type based on tier and usage
   */
  private determineLockoutType(tier: string, canProceed: boolean): 'full_app' | 'workspace_only' | null {
    if (canProceed) return null;
    
    // All tiers get full access when they have tokens
    // All tiers get blocked when they run out of tokens
    return 'full_app';
  }

  /**
   * Get upgrade message based on tier and situation
   */
  private getUpgradeMessage(tier: string, situation: string): string {
    switch (tier) {
      case 'free':
        return 'Upgrade to Lite (£7.99/month) for 1M tokens or Full (£14.99/month) for 1.6M tokens + top-ups.';
      case 'lite':
        return 'Upgrade to Full (£14.99/month) for 1.6M tokens plus the ability to purchase token top-ups.';
      case 'full':
        if (situation === 'tokens_exhausted') {
          return 'Purchase additional tokens for £2.00 per pack to continue using premium features.';
        }
        return 'Your AthroAi subscription includes 1.6M monthly tokens plus token top-up options.';
      default:
        return 'Upgrade your plan to access this feature.';
    }
  }

  /**
   * Check access to specific features
   */
  async checkAccess(userId: string, accessType: 'dashboard' | 'workspace'): Promise<{
    hasAccess: boolean;
    reason?: string;
    requiresUpgrade?: boolean;
    upgradeMessage?: string;
  }> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return { hasAccess: false, reason: 'No subscription found' };

    const limits = this.getTierLimits(subscription.tier);

    // Check token balance for access
    const usageCheck = await this.tokenMeter.canMakeAPICall(
      userId,
      'gpt-4o-mini',  // Use as reference model for access check
      100,            // Small token amount for check
      subscription.tier
    );

    // All tiers have access to both dashboard and workspace when they have tokens
    if (!usageCheck.canProceed) {
      return {
        hasAccess: false,
        reason: `Monthly token limit reached (${usageCheck.remainingTokens} tokens remaining)`,
        requiresUpgrade: true,
        upgradeMessage: this.getUpgradeMessage(subscription.tier, 'tokens_exhausted')
      };
    }

    return {
      hasAccess: true
    };
  }

  /**
   * Get token upgrade options for tier
   */
  getTokenUpgradeOptions(tier: 'free' | 'lite' | 'full'): {
    canUpgrade: boolean;
    options: Array<{
      fromTier: string;
      toTier: string;
      price: string;
      tokenIncrease: number;
    }>;
    topUpOptions?: Array<{
      price: string;
      description: string;
    }>;
  } {
    const baseOptions = [
      {
        fromTier: 'free',
        toTier: 'lite',
        price: '£7.99/month',
        tokenIncrease: 900000 // From 100k to 1M
      },
      {
        fromTier: 'free',
        toTier: 'full',
        price: '£14.99/month', 
        tokenIncrease: 1502000 // From 100k to 1.602M
      },
      {
        fromTier: 'lite',
        toTier: 'full',
        price: '£14.99/month',
        tokenIncrease: 602000 // From 1M to 1.602M
      }
    ];

    const options = baseOptions.filter(option => option.fromTier === tier);

    if (tier === 'full') {
      return {
        canUpgrade: true,
        options,
        topUpOptions: [
          {
            price: '£2.00',
            description: 'Token top-up pack'
          }
        ]
      };
    }

    return {
      canUpgrade: options.length > 0,
      options
    };
  }

  /**
   * Update user's subscription tier
   */
  async updateUserTier(userId: string, newTier: 'free' | 'lite' | 'full'): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          user_tier: newTier,
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: null // Managed by Stripe webhook
        })
        .eq('id', userId);

      return !error;
    } catch (error) {
      console.error('Failed to update user tier:', error);
      return false;
    }
  }

  /**
   * Get token balance for UI display (USER-FACING - no internal costs)
   */
  async getTokenBalance(userId: string): Promise<{
    remainingTokens: number;
    totalTokens: number;
    usedTokens: number;
    monthlySpendLimit: number;
    currentSpend: number;
    remainingSpend: number;
    tier: 'free' | 'lite' | 'full';
    isLowTokenWarning: boolean;
  }> {
    const subscription = await this.getUserSubscription(userId);
    const tier = subscription?.tier || 'free';
    
    const balance = await this.tokenMeter.getTokenBalance(userId, tier);
    
    return {
      ...balance,
      tier,
      isLowTokenWarning: balance.remainingTokens <= 300 && balance.remainingTokens > 0
    };
  }
} 