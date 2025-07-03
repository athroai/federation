/**
 * ✅ ATHRO AI SUBSCRIPTION SERVICE
 * 
 * Handles all subscription logic, tier checking, and access control
 * Updated for new monthly token-based SaaS model
 */

import { createClient } from '@supabase/supabase-js';
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
  private static instance: SubscriptionService;
  private supabase: any;
  private tokenMeter: TokenMeterService;

  private constructor() {
    // Initialize Supabase client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn('Supabase credentials not found');
    }

    // Initialize TokenMeterService
    this.tokenMeter = TokenMeterService.getInstance();
  }

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * 🔥 UPDATED TIER LIMITS - NEW SAAS MODEL
   * Monthly token-based limits matching user requirements
   */
  getTierLimits(tier: 'free' | 'lite' | 'full'): TierLimits {
    switch (tier) {
      case 'free':
        return {
          monthlySpendLimitGBP: 0.20,     // £0.20/month
          monthlyTokenLimit: 300,         // ~300 tokens
          hasWorkspaceAccess: true,       // Limited access until tokens run out
          hasDashboardAccess: true,       // Limited access until tokens run out
          description: 'Free trial: 300 tokens per month',
          price: 'Free',
          features: [
            '300 tokens per month',
            'Basic AI chat access',
            'Basic workspace features',
            'Basic dashboard features'
          ]
        };
      
      case 'lite':
        return {
          monthlySpendLimitGBP: 3.00,     // £3.00/month
          monthlyTokenLimit: 4500,        // ~4,500 tokens
          hasWorkspaceAccess: true,       // Full workspace access
          hasDashboardAccess: false,      // BLOCKED from dashboard (upgrade modal)
          description: 'Lite plan: Full workspace access only',
          price: '£3.00/month',
          features: [
            '4,500 tokens per month',
            'Full workspace access',
            'Advanced AI features',
            'Progress saved',
            'No dashboard access'
          ]
        };
      
      case 'full':
        return {
          monthlySpendLimitGBP: 7.00,     // £7.00/month
          monthlyTokenLimit: 10500,       // ~10,500 tokens
          hasWorkspaceAccess: true,       // Full access until spend limit
          hasDashboardAccess: true,       // Full access to dashboard
          description: 'AthroAI: Full access with extra token purchase option',
          price: '£7.00/month',
          features: [
            '10,500 tokens per month',
            'Full dashboard access',
            'Full workspace access',
            'All premium features',
            'Buy extra tokens option',
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
   * Determine what type of lockout to apply based on tier and usage
   */
  private determineLockoutType(tier: 'free' | 'lite' | 'full', canProceed: boolean): 'full_app' | 'workspace_only' | null {
    if (canProceed) return null;

    switch (tier) {
      case 'free':
        return 'full_app'; // Free users get completely locked out
      case 'lite':
        return 'workspace_only'; // Lite users only lose workspace access
      case 'full':
        return 'workspace_only'; // Full users only lose workspace access, can buy more tokens
      default:
        return 'full_app';
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

    // Check spend limit first
    const usageCheck = await this.tokenMeter.canMakeAPICall(
      userId,
      'gpt-4',  // Use as reference model
      100,      // Small token amount for check
      subscription.tier
    );

    // If user has hit spend limit
    if (!usageCheck.canProceed) {
      const lockoutType = this.determineLockoutType(subscription.tier, false);
      
      if (accessType === 'workspace' && lockoutType !== 'full_app') {
        return {
          hasAccess: false,
          reason: `Monthly token limit reached (${usageCheck.remainingTokens} tokens remaining)`,
          requiresUpgrade: true,
          upgradeMessage: this.getUpgradeMessage(subscription.tier, 'tokens_exhausted')
        };
      }
      
      if (accessType === 'dashboard' && lockoutType === 'full_app') {
        return {
          hasAccess: false,
          reason: 'Monthly token limit reached',
          requiresUpgrade: true,
          upgradeMessage: this.getUpgradeMessage(subscription.tier, 'tokens_exhausted')
        };
      }
    }

    // Check feature access based on tier
    switch (accessType) {
      case 'dashboard':
        return {
          hasAccess: limits.hasDashboardAccess,
          reason: limits.hasDashboardAccess ? undefined : 'Dashboard requires AthroAI subscription',
          requiresUpgrade: !limits.hasDashboardAccess,
          upgradeMessage: this.getUpgradeMessage(subscription.tier, 'feature_locked')
        };

      case 'workspace':
        return {
          hasAccess: limits.hasWorkspaceAccess,
          reason: limits.hasWorkspaceAccess ? undefined : 'Workspace access limit reached',
          requiresUpgrade: !limits.hasWorkspaceAccess,
          upgradeMessage: this.getUpgradeMessage(subscription.tier, 'feature_locked')
        };

      default:
        return { hasAccess: false, reason: 'Invalid access type' };
    }
  }

  /**
   * Get appropriate upgrade message based on tier and situation
   */
  private getUpgradeMessage(tier: 'free' | 'lite' | 'full', situation: 'tokens_exhausted' | 'feature_locked'): string {
    if (situation === 'tokens_exhausted') {
      switch (tier) {
        case 'free':
          return 'Upgrade to Lite or AthroAI for more tokens.';
        case 'lite':
          return 'Upgrade to AthroAI for more tokens.';
        case 'full':
          return 'Buy more tokens to continue.';
        default:
          return 'Upgrade your plan to continue.';
      }
    } else { // feature_locked
      switch (tier) {
        case 'free':
          return 'Unlock this feature with Lite or AthroAI.';
        case 'lite':
          return 'Unlock this feature with AthroAI.';
        case 'full':
          return 'Feature available with your current plan.';
        default:
          return 'Upgrade to unlock this feature.';
      }
    }
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
   * Get token balance for UI display
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