import { createClient } from '@supabase/supabase-js';

export type ModelType = 'gpt-4' | 'gpt-4-turbo';

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalCostGBP: number;
}

interface MonthlyUsage {
  totalTokens: number;
  totalSpendGBP: number;
  remainingTokens: number;
  lastResetDate: string;
}

const PRICES_GBP: Record<ModelType, { input: number; output: number }> = {
  'gpt-4': { input: 0.00198, output: 0.00792 },      // £0.00198/1K input, £0.00792/1K output
  'gpt-4-turbo': { input: 0.00099, output: 0.00297 } // £0.00099/1K input, £0.00297/1K output
};

// Monthly spend limits and token equivalents (updated for new SaaS model)
const TIER_MONTHLY_LIMITS = {
  free: {
    spendLimitGBP: 0.20,    // £0.20/month
    tokenEquivalent: 300,   // Approximately 300 tokens worth
    description: 'Free tier with basic access'
  },
  lite: {
    spendLimitGBP: 3.00,    // £3.00/month  
    tokenEquivalent: 4500,  // Approximately 4,500 tokens worth
    description: 'Lite tier with expanded access'
  },
  full: {
    spendLimitGBP: 7.00,    // £7.00/month (called AthroAI in UI)
    tokenEquivalent: 10500, // Approximately 10,500 tokens worth
    description: 'Full AthroAI access with highest limits'
  }
};

export class TokenMeterService {
  private static instance: TokenMeterService;
  private supabase: any;

  private constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  static getInstance(): TokenMeterService {
    if (!TokenMeterService.instance) {
      TokenMeterService.instance = new TokenMeterService();
    }
    return TokenMeterService.instance;
  }

  /**
   * Calculate GBP cost for a specific API call
   */
  calculateUsageCost(model: ModelType, inputTokens: number, outputTokens: number): TokenUsage {
    const pricePerInputToken = PRICES_GBP[model].input / 1000;
    const pricePerOutputToken = PRICES_GBP[model].output / 1000;

    const totalCostGBP = Number(
      (inputTokens * pricePerInputToken + outputTokens * pricePerOutputToken).toFixed(6)
    );

    return {
      inputTokens,
      outputTokens,
      totalCostGBP
    };
  }

  /**
   * Get tier limits and information
   */
  getTierLimits(tier: 'free' | 'lite' | 'full') {
    return TIER_MONTHLY_LIMITS[tier] || TIER_MONTHLY_LIMITS.free;
  }

  /**
   * Check if user can make the API call based on their tier's monthly spend limit
   */
  async canMakeAPICall(
    userId: string,
    model: ModelType,
    estimatedInputTokens: number,
    tier: 'free' | 'lite' | 'full'
  ): Promise<{
    canProceed: boolean;
    reason?: string;
    estimatedCostGBP: number;
    remainingBudgetGBP: number;
    remainingTokens: number;
    isLowTokenWarning: boolean;
  }> {
    // Get current monthly usage
    const usage = await this.getMonthlyUsage(userId);
    
    // Calculate estimated cost
    const estimatedUsage = this.calculateUsageCost(
      model,
      estimatedInputTokens,
      Math.ceil(estimatedInputTokens * 0.5) // Estimate output tokens as 50% of input
    );

    // Get monthly limit for tier
    const tierLimits = this.getTierLimits(tier);
    
    // Calculate remaining budget
    const remainingBudgetGBP = Number(
      (tierLimits.spendLimitGBP - usage.totalSpendGBP).toFixed(6)
    );

    // Calculate remaining tokens (approximation)
    const remainingTokens = Math.max(0, usage.remainingTokens);

    // Check for low token warning (below 300 tokens)
    const isLowTokenWarning = remainingTokens <= 300 && remainingTokens > 0;

    // Check if call would exceed limit
    if (estimatedUsage.totalCostGBP > remainingBudgetGBP || remainingTokens <= 0) {
      return {
        canProceed: false,
        reason: remainingTokens <= 0 
          ? 'Monthly token limit reached' 
          : `Monthly spend limit reached. Available: £${remainingBudgetGBP.toFixed(3)}`,
        estimatedCostGBP: estimatedUsage.totalCostGBP,
        remainingBudgetGBP,
        remainingTokens,
        isLowTokenWarning: false // No warning if already at 0
      };
    }

    return {
      canProceed: true,
      estimatedCostGBP: estimatedUsage.totalCostGBP,
      remainingBudgetGBP,
      remainingTokens,
      isLowTokenWarning
    };
  }

  /**
   * Record actual token usage after API call
   */
  async recordUsage(
    userId: string,
    model: ModelType,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const usage = this.calculateUsageCost(model, inputTokens, outputTokens);
    
    // Get current usage
    const monthlyUsage = await this.getMonthlyUsage(userId);
    
    // Update totals
    const newTotalTokens = monthlyUsage.totalTokens + inputTokens + outputTokens;
    const newTotalSpend = Number(
      (monthlyUsage.totalSpendGBP + usage.totalCostGBP).toFixed(6)
    );

    // Update database
    await this.supabase
      .from('user_usage')
      .upsert({
        user_id: userId,
        total_tokens: newTotalTokens,
        total_spend_gbp: newTotalSpend,
        last_reset_date: monthlyUsage.lastResetDate
      });
  }

  /**
   * Get user's current monthly usage
   */
  async getMonthlyUsage(userId: string): Promise<MonthlyUsage> {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
    
    const { data, error } = await this.supabase
      .from('user_usage')
      .select('total_tokens, total_spend_gbp, last_reset_date')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {
        totalTokens: 0,
        totalSpendGBP: 0,
        remainingTokens: TIER_MONTHLY_LIMITS.free.tokenEquivalent,
        lastResetDate: currentMonth
      };
    }

    // Check if we need to reset monthly usage (new month)
    const dataMonth = data.last_reset_date ? data.last_reset_date.substring(0, 7) : '';
    if (dataMonth !== currentMonth) {
      return {
        totalTokens: 0,
        totalSpendGBP: 0,
        remainingTokens: TIER_MONTHLY_LIMITS.free.tokenEquivalent,
        lastResetDate: currentMonth
      };
    }

    // Calculate remaining tokens based on spend
    const userTier = await this.getUserTier(userId);
    const tierLimits = this.getTierLimits(userTier);
    const remainingBudget = tierLimits.spendLimitGBP - data.total_spend_gbp;
    const remainingTokens = Math.max(0, Math.floor(remainingBudget / 0.001)); // Rough conversion

    return {
      totalTokens: data.total_tokens,
      totalSpendGBP: data.total_spend_gbp,
      remainingTokens,
      lastResetDate: data.last_reset_date
    };
  }

  /**
   * Get user's current tier from database
   */
  private async getUserTier(userId: string): Promise<'free' | 'lite' | 'full'> {
    if (!this.supabase) return 'free';
    
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('user_tier')
        .eq('id', userId)
        .single();

      if (error || !data) return 'free';
      return data.user_tier || 'free';
    } catch (error) {
      console.error('Error fetching user tier:', error);
      return 'free';
    }
  }

  /**
   * Get current token balance for UI display
   */
  async getTokenBalance(userId: string, tier: 'free' | 'lite' | 'full'): Promise<{
    remainingTokens: number;
    totalTokens: number;
    usedTokens: number;
    monthlySpendLimit: number;
    currentSpend: number;
    remainingSpend: number;
  }> {
    const usage = await this.getMonthlyUsage(userId);
    const tierLimits = this.getTierLimits(tier);
    
    return {
      remainingTokens: usage.remainingTokens,
      totalTokens: tierLimits.tokenEquivalent,
      usedTokens: tierLimits.tokenEquivalent - usage.remainingTokens,
      monthlySpendLimit: tierLimits.spendLimitGBP,
      currentSpend: usage.totalSpendGBP,
      remainingSpend: tierLimits.spendLimitGBP - usage.totalSpendGBP
    };
  }
} 