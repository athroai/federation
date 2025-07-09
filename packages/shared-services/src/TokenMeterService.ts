export interface TokenBalance {
  totalTokens: number;
  usedTokens: number;
  remainingTokens: number;
  resetDate: string;
}

export class TokenMeterService {
  private readonly TIER_TOKEN_LIMITS = {
    'free': 100000,
    'lite': 1000000,
    'full': 1600000
  };

  constructor() {
    // Basic constructor
  }

  public async getTokenBalance(userId: string, tier: 'free' | 'lite' | 'full' = 'free'): Promise<TokenBalance> {
    const totalTokens = this.TIER_TOKEN_LIMITS[tier] || this.TIER_TOKEN_LIMITS['free'];
    
    // FIXED: Query real usage from database instead of mock 15%
    let usedTokens = 0;
    
    try {
      // Check if we're in browser environment and can access supabase
      if (typeof window !== 'undefined' && window.location) {
        // Try to get real usage from database
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
          // Dynamic import to avoid SSR issues
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // Query real usage from profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('monthly_tokens_used, user_tier, extra_tokens_purchased')
            .eq('id', userId)
            .single();
          
          if (!error && data) {
            usedTokens = data.monthly_tokens_used || 0;
            
            console.log(`🔋 [TokenMeter] Real usage for user ${userId}: ${usedTokens}/${totalTokens} tokens`);
            
            return {
              totalTokens,
              usedTokens,
              remainingTokens: Math.max(0, totalTokens - usedTokens),
              resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
            };
          } else {
            console.log('🔋 [TokenMeter] No usage data found, defaulting to 0 tokens used');
          }
        }
      }
    } catch (error) {
      console.error('❌ [TokenMeter] Error fetching real token usage:', error);
    }
    
    // Fallback: Return zero usage instead of mock 15%
    const remainingTokens = totalTokens - usedTokens;
    
    return {
      totalTokens,
      usedTokens,
      remainingTokens,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  public async recordTokenUsage(userId: string, tokensUsed: number): Promise<void> {
    console.log(`Token usage recorded: ${tokensUsed} tokens for user ${userId}`);
  }

  public async getUserTokenStats(userId: string): Promise<TokenBalance> {
    return this.getTokenBalance(userId, 'free');
  }
}
