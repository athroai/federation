export interface TokenBalance {
  totalTokens: number;
  usedTokens: number;
  remainingTokens: number;
  resetDate: string;
}

export class TokenMeterService {
  // ✅ FIXED: July 2025 pricing structure - correct token limits
  private readonly TIER_TOKEN_LIMITS = {
    'free': 100000,    // ✅ 100,000 tokens/month
    'lite': 1000000,   // ✅ 1,000,000 tokens/month
    'full': 1602000    // ✅ 1,602,000 tokens/month (was 1,600,000)
  };

  // ✅ NEW: Token top-up constants (July 2025)
  private readonly TOKEN_PACK_SIZE = 320000;        // 320,000 tokens per pack
  private readonly TOKEN_PACK_PRICE_GBP = 2.00;     // £2.00 per pack
  private readonly TOP_UP_AVAILABLE_FOR = ['full']; // Only full tier users

  constructor() {
    // Basic constructor
  }

  public async getTokenBalance(userId: string, tier: 'free' | 'lite' | 'full' = 'free'): Promise<TokenBalance> {
    try {
      console.log(`🔋 [TokenMeterService] Starting getTokenBalance for user: ${userId}, tier: ${tier}`);
      
      // Check if we're in browser environment and can access supabase
      if (typeof window !== 'undefined' && window.location) {
        // Try to get real usage from database
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
        
        console.log(`🔋 [TokenMeterService] Environment check: supabaseUrl=${!!supabaseUrl}, supabaseKey=${!!supabaseKey}`);
        
        if (supabaseUrl && supabaseKey) {
          // Dynamic import to avoid SSR issues
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          console.log(`🔋 [TokenMeterService] Supabase client created, querying user_token_balance view...`);
          
          // ✅ FIXED: Use the user_token_balance view that includes extra tokens
          const { data, error } = await supabase
            .from('user_token_balance')
            .select('total_monthly_tokens, tokens_used, tokens_remaining')
            .eq('user_id', userId)
            .single();
          
          console.log(`🔋 [TokenMeterService] Database query result:`, { data, error });
          
          if (!error && data) {
            console.log(`🔋 [TokenMeter] Real usage for user ${userId}: ${data.tokens_used}/${data.total_monthly_tokens} tokens`);
            
            const result = {
              totalTokens: data.total_monthly_tokens,
              usedTokens: data.tokens_used,
              remainingTokens: Math.max(0, data.tokens_remaining),
              resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
            };
            
            console.log(`🔋 [TokenMeterService] Returning database result:`, result);
            return result;
          } else {
            console.log('🔋 [TokenMeter] No usage data found or error occurred, using tier defaults. Error:', error);
          }
        } else {
          console.log('🔋 [TokenMeterService] Missing Supabase credentials, falling back to defaults');
        }
      } else {
        console.log('🔋 [TokenMeterService] Not in browser environment, using defaults');
      }
    } catch (error) {
      console.error('❌ [TokenMeter] Error fetching real token usage:', error);
    }
    
    // Fallback: Return tier defaults
    const totalTokens = this.TIER_TOKEN_LIMITS[tier] || this.TIER_TOKEN_LIMITS['free'];
    
    console.log(`🔋 [TokenMeterService] Using fallback tier defaults for ${tier}:`, { totalTokens });
    
    return {
      totalTokens,
      usedTokens: 0,
      remainingTokens: totalTokens,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  public async recordTokenUsage(userId: string, tokensUsed: number): Promise<void> {
    // Basic implementation - log usage
    console.log(`Token usage recorded: ${tokensUsed} tokens for user ${userId}`);
  }

  public async getUserTokenStats(userId: string): Promise<TokenBalance> {
    return this.getTokenBalance(userId, 'free');
  }

  // ✅ NEW: Token top-up utilities
  public getTokenPackInfo() {
    return {
      tokensPerPack: this.TOKEN_PACK_SIZE,
      pricePerPack: this.TOKEN_PACK_PRICE_GBP,
      availableForTiers: this.TOP_UP_AVAILABLE_FOR,
      currency: 'GBP'
    };
  }

  public canPurchaseTokens(tier: 'free' | 'lite' | 'full'): boolean {
    return this.TOP_UP_AVAILABLE_FOR.includes(tier);
  }

  // ✅ Get correct tier limits
  public getTierLimits() {
    return { ...this.TIER_TOKEN_LIMITS };
  }
}
