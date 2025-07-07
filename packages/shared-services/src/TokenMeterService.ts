import { getSupabaseClient, SupabaseClient } from './supabaseClient';

export type ModelType = 'gpt-4o-mini' | 'gpt-4o'; // Updated for new model routing

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

// Updated pricing for new model structure (GPT-4.1 = gpt-4o, GPT-4.1 mini = gpt-4o-mini)
const PRICES_GBP: Record<ModelType, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.00012, output: 0.00048 },  // GPT-4.1 mini - much cheaper for general tasks
  'gpt-4o': { input: 0.00396, output: 0.01188 }        // GPT-4.1 - premium model for quizzes only
};

// NEW SAAS TOKEN LIMITS - Dramatically increased as specified
const TIER_MONTHLY_LIMITS = {
  free: {
    spendLimitGBP: 50.00,      // £50/month internal budget (not shown to users)
    tokenEquivalent: 100000,   // 100,000 tokens/month
    description: 'Free tier with generous access'
  },
  lite: {
    spendLimitGBP: 500.00,     // £500/month internal budget  
    tokenEquivalent: 1000000,  // 1,000,000 tokens/month
    description: 'Lite tier with expanded access'
  },
  full: {
    spendLimitGBP: 800.00,     // £800/month internal budget
    tokenEquivalent: 1602000,  // 1,602,000 tokens/month
            description: 'Full AthroAi access with highest limits'
  }
};

export class TokenMeterService {
  private supabase: any;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    // Always use shared client to prevent multiple instances
    this.supabase = getSupabaseClient();
  }

  /**
   * Get tier limits (updated for new token structure)
   */
  getTierLimits(tier: 'free' | 'lite' | 'full') {
    return TIER_MONTHLY_LIMITS[tier] || TIER_MONTHLY_LIMITS.free;
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
   * CRITICAL: Quiz Model Enforcement
   * All quizzes MUST use GPT-4.1 (gpt-4o) regardless of user tier
   */
  enforceQuizModel(task: string): ModelType {
    // Check for quiz-related keywords
    const quizKeywords = [
      'quiz', 'questions', 'mcq', 'multiple choice', 'generate questions',
      'test questions', 'assessment questions', 'practice questions',
      'flashcard', 'flashcards', 'exam questions'
    ];
    
    const isQuizTask = quizKeywords.some(keyword => 
      task.toLowerCase().includes(keyword)
    );
    
    if (isQuizTask) {
      return 'gpt-4o'; // ALWAYS use GPT-4.1 for quizzes
    }
    
    return 'gpt-4o-mini'; // Default to GPT-4.1 mini for everything else
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

    // Calculate remaining tokens (approximation based on token equivalents)
    const remainingTokens = Math.max(0, tierLimits.tokenEquivalent - usage.totalTokens);

    // Check for low token warning (below 300 tokens)
    const isLowTokenWarning = remainingTokens <= 300 && remainingTokens > 0;

    // Check if call would exceed limit - use token-based checking primarily
    if (remainingTokens <= 0) {
      return {
        canProceed: false,
        reason: 'Monthly token limit reached',
        estimatedCostGBP: estimatedUsage.totalCostGBP,
        remainingBudgetGBP,
        remainingTokens: 0,
        isLowTokenWarning: false // No warning if already at 0
      };
    }

    // Estimate tokens needed (input + estimated output)
    const totalEstimatedTokens = estimatedInputTokens + Math.ceil(estimatedInputTokens * 0.5);
    
    if (totalEstimatedTokens > remainingTokens) {
      return {
        canProceed: false,
        reason: `Insufficient tokens remaining. Need ${totalEstimatedTokens}, have ${remainingTokens}`,
        estimatedCostGBP: estimatedUsage.totalCostGBP,
        remainingBudgetGBP,
        remainingTokens,
        isLowTokenWarning: false
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

    return {
      totalTokens: data.total_tokens,
      totalSpendGBP: data.total_spend_gbp,
      remainingTokens: data.total_tokens, // We'll calculate this in the calling service
      lastResetDate: data.last_reset_date
    };
  }

  /**
   * Get user tier from database
   */
  async getUserTier(userId: string): Promise<'free' | 'lite' | 'full'> {
    if (!this.supabase) return 'free';

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('user_tier')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return 'free';
      }

      return data.user_tier || 'free';
    } catch (error) {
      console.error('Error getting user tier:', error);
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
    
    const usedTokens = usage.totalTokens;
    const remainingTokens = Math.max(0, tierLimits.tokenEquivalent - usedTokens);
    
    return {
      remainingTokens,
      totalTokens: tierLimits.tokenEquivalent,
      usedTokens,
      monthlySpendLimit: tierLimits.spendLimitGBP,
      currentSpend: usage.totalSpendGBP,
      remainingSpend: tierLimits.spendLimitGBP - usage.totalSpendGBP
    };
  }
} 