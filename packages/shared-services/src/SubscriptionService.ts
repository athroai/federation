export interface UsageCheck {
  success: boolean;
  canProceed: boolean;
  error?: string;
  currentSpendGBP: number;
  monthlyLimitGBP: number;
  remainingGBP: number;
  remainingTokens: number;
  tier: 'free' | 'lite' | 'full';
}

export interface UserSubscription {
  tier: 'free' | 'lite' | 'full';
  spentThisMonthGBP: number;
  monthlyLimitGBP: number;
  remainingGBP: number;
  lastActivityResetDate: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface AccessCheck {
  hasAccess: boolean;
  reason?: string;
  requiresUpgrade?: boolean;
  lockoutType?: 'full_app' | 'workspace_only' | 'none';
}

export class SubscriptionService {
  private readonly TIER_LIMITS = {
    'free': 10,
    'lite': 50, 
    'full': 200
  };

  constructor(supabaseUrl: string, supabaseKey: string) {
    // Basic constructor - could be enhanced with actual Supabase client
  }

  public async checkUsageBeforeAction(
    userId: string, 
    model: string = 'gpt-4o-mini', 
    estimatedTokens: number = 100
  ): Promise<UsageCheck> {
    // Basic implementation that allows usage
    return {
      success: true,
      canProceed: true,
      currentSpendGBP: 0,
      monthlyLimitGBP: 50,
      remainingGBP: 50,
      remainingTokens: 10000,
      tier: 'free'
    };
  }

  public async recordUsage(
    userId: string,
    model: string = 'gpt-4o-mini',
    inputTokens: number = 0,
    outputTokens: number = 0
  ): Promise<void> {
    // Basic implementation - log usage
    console.log(`Usage recorded: ${inputTokens + outputTokens} tokens for user ${userId}`);
  }

  public async checkAccess(userId: string, accessType: 'dashboard' | 'workspace'): Promise<AccessCheck> {
    return {
      hasAccess: true,
      lockoutType: 'none'
    };
  }

  public async updateUserTier(userId: string, newTier: 'free' | 'lite' | 'full'): Promise<boolean> {
    // Basic implementation - always succeeds
    console.log(`Updated user ${userId} to tier ${newTier}`);
    return true;
  }

  public async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    // Return a basic subscription based on stored tier or default to free
    const tierLimits = { 'free': 10, 'lite': 50, 'full': 200 };
    const tier = 'free'; // Could be enhanced to read from database
    
    return {
      tier,
      spentThisMonthGBP: 0,
      monthlyLimitGBP: tierLimits[tier],
      remainingGBP: tierLimits[tier],
      lastActivityResetDate: new Date().toISOString().substring(0, 7) + '-01'
    };
  }

  public async checkQuizUsage(userId: string, estimatedTokens: number): Promise<UsageCheck> {
    return this.checkUsageBeforeAction(userId, 'gpt-4o-mini', estimatedTokens);
  }

  public async getTokenBalance(userId: string): Promise<any> {
    // Basic token balance implementation
    return {
      totalTokens: 100000,
      usedTokens: 15000,
      remainingTokens: 85000,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
} 