import { createClient } from '@supabase/supabase-js';

interface TokenEnforcementResult {
  canProceed: boolean;
  success: boolean;
  tokensUsed?: number;
  tokensRemaining?: number;
  limit?: number;
  tier?: string;
  error?: string;
  reason?: string;
}

interface TokenBalance {
  totalTokens: number;
  usedTokens: number;
  remainingTokens: number;
  isLowTokenWarning: boolean;
  tier: string;
  resetDate: string;
}

export class TokenEnforcementService {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * ⚡ ENFORCEMENT: Check if user can proceed with token usage BEFORE API call
   * This calls the database function that enforces limits
   */
  public async checkTokenUsage(userId: string, estimatedTokens: number, model: string = 'gpt-4o-mini'): Promise<TokenEnforcementResult> {
    if (!this.supabase) {
      return { canProceed: false, success: false, error: 'Supabase not initialized' };
    }

    try {
      // Estimate cost based on model (July 2025 pricing)
      const costPerToken = this.getModelCostPerToken(model);
      const estimatedCostGBP = estimatedTokens * costPerToken;

      console.log(`🔍 [TokenEnforcement] Checking ${estimatedTokens} tokens (${model}) for user ${userId}`);

      // Call the database function that enforces limits
      const { data, error } = await this.supabase.rpc('record_token_usage', {
        p_user_id: userId,
        p_tokens_used: estimatedTokens,
        p_cost_gbp: estimatedCostGBP,
        p_model: model
      });

      if (error) {
        console.error('❌ [TokenEnforcement] Database error:', error);
        return { 
          canProceed: false, 
          success: false, 
          error: `Database error: ${error.message}` 
        };
      }

      if (!data.success) {
        console.warn(`⚠️ [TokenEnforcement] LIMIT EXCEEDED for user ${userId}:`, data.error);
        return {
          canProceed: false,
          success: false,
          error: data.error,
          reason: data.error,
          tokensRemaining: data.remaining || 0,
          limit: data.limit || 0,
          tier: data.tier || 'unknown'
        };
      }

      console.log(`✅ [TokenEnforcement] Approved ${estimatedTokens} tokens. Remaining: ${data.tokens_remaining}`);
      
      return {
        canProceed: true,
        success: true,
        tokensUsed: data.tokens_used,
        tokensRemaining: data.tokens_remaining,
        limit: data.limit,
        tier: data.tier
      };

    } catch (error) {
      console.error('❌ [TokenEnforcement] Unexpected error:', error);
      return { 
        canProceed: false, 
        success: false, 
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}` 
      };
    }
  }

  /**
   * 📊 Get current token balance (manual check)
   * No automatic refreshing - user triggers this manually
   */
  public async getCurrentBalance(userId: string): Promise<TokenBalance> {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    try {
      console.log(`🔍 [TokenEnforcement] Manual balance check for user ${userId}`);

      // Query the user_token_balance view for current balance
      const { data, error } = await this.supabase
        .from('user_token_balance')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ [TokenEnforcement] Failed to get balance:', error);
        throw new Error(`Failed to get token balance: ${error.message}`);
      }

      const balance: TokenBalance = {
        totalTokens: data.total_monthly_tokens || 0,
        usedTokens: data.tokens_used || 0,
        remainingTokens: data.tokens_remaining || 0,
        isLowTokenWarning: data.is_low_token_warning || false,
        tier: data.user_tier || 'free',
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
      };

      console.log(`💰 [TokenEnforcement] Balance for ${userId}:`, {
        used: balance.usedTokens,
        remaining: balance.remainingTokens,
        total: balance.totalTokens,
        tier: balance.tier
      });

      return balance;

    } catch (error) {
      console.error('❌ [TokenEnforcement] Error getting balance:', error);
      throw error;
    }
  }

  /**
   * ⚡ ENFORCEMENT: Record actual token usage AFTER API call
   * This calls the database function to update usage
   */
  public async recordActualUsage(
    userId: string, 
    actualTokensUsed: number, 
    model: string = 'gpt-4o-mini'
  ): Promise<TokenEnforcementResult> {
    if (!this.supabase) {
      return { canProceed: false, success: false, error: 'Supabase not initialized' };
    }

    try {
      const costPerToken = this.getModelCostPerToken(model);
      const actualCostGBP = actualTokensUsed * costPerToken;

      console.log(`📝 [TokenEnforcement] Recording actual usage: ${actualTokensUsed} tokens (${model})`);

      // Call the database function to record actual usage
      const { data, error } = await this.supabase.rpc('record_token_usage', {
        p_user_id: userId,
        p_tokens_used: actualTokensUsed,
        p_cost_gbp: actualCostGBP,
        p_model: model
      });

      if (error || !data.success) {
        console.error('❌ [TokenEnforcement] Failed to record usage:', error || data.error);
        return { 
          canProceed: false, 
          success: false, 
          error: error?.message || data.error 
        };
      }

      console.log(`✅ [TokenEnforcement] Recorded ${actualTokensUsed} tokens. Remaining: ${data.tokens_remaining}`);

      return {
        canProceed: true,
        success: true,
        tokensUsed: data.tokens_used,
        tokensRemaining: data.tokens_remaining,
        limit: data.limit,
        tier: data.tier
      };

    } catch (error) {
      console.error('❌ [TokenEnforcement] Error recording usage:', error);
      return { 
        canProceed: false, 
        success: false, 
        error: `Failed to record usage: ${error instanceof Error ? error.message : 'Unknown'}` 
      };
    }
  }

  /**
   * Get model cost per token (July 2025 pricing)
   */
  private getModelCostPerToken(model: string): number {
    const costs: Record<string, number> = {
      'gpt-4o': 0.000015,      // Higher cost for GPT-4
      'gpt-4o-mini': 0.0000006, // Lower cost for mini
      'gpt-4.1': 0.000015,     // Same as GPT-4o
      'gpt-4': 0.000015,       // Fallback
      'gpt-3.5-turbo': 0.0000006 // Fallback to mini cost
    };

    return costs[model] || costs['gpt-4o-mini']; // Default to mini cost
  }

  /**
   * Check if user is approaching token limits (for warnings)
   */
  public async checkLowTokenWarning(userId: string): Promise<{
    isLowTokenWarning: boolean;
    tokensRemaining: number;
    warningThreshold: number;
    tier: string;
  }> {
    try {
      const balance = await this.getCurrentBalance(userId);
      const warningThreshold = Math.max(balance.totalTokens * 0.05, 1000); // 5% or 1000 tokens minimum
      
      return {
        isLowTokenWarning: balance.remainingTokens <= warningThreshold && balance.remainingTokens > 0,
        tokensRemaining: balance.remainingTokens,
        warningThreshold,
        tier: balance.tier
      };
    } catch (error) {
      console.error('❌ [TokenEnforcement] Error checking warning:', error);
      return {
        isLowTokenWarning: false,
        tokensRemaining: 0,
        warningThreshold: 0,
        tier: 'unknown'
      };
    }
  }

  /**
   * Send low token notification (if enabled in user preferences)
   */
  public async sendLowTokenNotification(userId: string): Promise<void> {
    try {
      const warning = await this.checkLowTokenWarning(userId);
      
      if (warning.isLowTokenWarning) {
        // Trigger browser notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('AthroAi Token Warning', {
            body: `You have ${warning.tokensRemaining.toLocaleString()} tokens remaining this month.`,
            icon: '/png/athro-astrology.png'
          });
        }

        // Dispatch custom event for UI components to handle
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lowTokenWarning', {
            detail: {
              tokensRemaining: warning.tokensRemaining,
              tier: warning.tier,
              warningThreshold: warning.warningThreshold
            }
          }));
        }

        console.log(`⚠️ [TokenEnforcement] Low token warning sent for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ [TokenEnforcement] Error sending notification:', error);
    }
  }
}

// Export types as well
export type { TokenEnforcementResult, TokenBalance }; 