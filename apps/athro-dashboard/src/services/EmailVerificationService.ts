import { supabase } from './supabaseClient';

export interface VerificationStatus {
  user_id: string;
  email: string;
  email_confirmed: boolean;
  email_confirmed_at: string | null;
  tier: string;
}

export class EmailVerificationService {
  private static pollingIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Production-grade email verification checker
   * Polls your own database (NOT Supabase Auth) to check verification status
   */
  static async checkVerificationStatus(email: string): Promise<VerificationStatus | null> {
    try {
      console.log('🔍 Checking email verification status for:', email);
      console.log('📡 Making RPC call to check_email_verification_status...');
      
      // Poll YOUR database, not Supabase Auth session
      const { data, error } = await supabase
        .rpc('check_email_verification_status', { 
          user_email: email 
        });

      console.log('📡 RPC response:', { data, error });

      if (error) {
        console.error('❌ Error checking verification status:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        return null;
      }

      if (!data || data.length === 0) {
        console.log('❌ No user found for email:', email);
        console.log('❌ RPC returned empty data:', data);
        return null;
      }

      const userStatus = data[0] as VerificationStatus;
      console.log('📊 Verification status:', {
        email: userStatus.email,
        confirmed: userStatus.email_confirmed,
        confirmed_at: userStatus.email_confirmed_at,
        tier: userStatus.tier,
        user_id: userStatus.user_id
      });

      return userStatus;
    } catch (error) {
      console.error('❌ Verification check failed:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else {
        console.error('❌ Unknown error type:', error);
      }
      return null;
    }
  }

  /**
   * Start polling for email verification every 5 seconds
   * This is the production-safe approach that works across devices/browsers
   */
  static startPolling(
    email: string,
    onVerified: (status: VerificationStatus) => void,
    onError?: (error: string) => void,
    intervalMs: number = 5000
  ): void {
    // Stop any existing polling for this email
    this.stopPolling(email);

    console.log(`🔄 Starting email verification polling for: ${email} (every ${intervalMs}ms)`);

    const interval = setInterval(async () => {
      try {
        console.log(`⏰ Polling check #${Date.now()} for:`, email);
        const status = await this.checkVerificationStatus(email);
        
        if (status && status.email_confirmed) {
          console.log('✅ Email verified! Stopping polling and calling onVerified');
          console.log('✅ Verification details:', status);
          this.stopPolling(email);
          onVerified(status);
        } else {
          console.log('⏳ Email not yet verified, continuing to poll...', {
            status,
            email_confirmed: status?.email_confirmed
          });
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
        if (onError) {
          onError(error instanceof Error ? error.message : 'Unknown polling error');
        }
      }
    }, intervalMs);

    this.pollingIntervals.set(email, interval);
    console.log(`📊 Polling intervals now tracking: ${Array.from(this.pollingIntervals.keys()).join(', ')}`);
  }

  /**
   * Stop polling for a specific email
   */
  static stopPolling(email: string): void {
    const interval = this.pollingIntervals.get(email);
    if (interval) {
      console.log('🛑 Stopping email verification polling for:', email);
      clearInterval(interval);
      this.pollingIntervals.delete(email);
    }
  }

  /**
   * Stop all polling intervals (cleanup)
   */
  static stopAllPolling(): void {
    console.log('🛑 Stopping all email verification polling');
    this.pollingIntervals.forEach((interval, email) => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();
  }

  /**
   * Manual verification check with force refresh
   * Use this for "Check Status" button clicks
   */
  static async forceCheckVerification(email: string): Promise<VerificationStatus | null> {
    console.log('🔨 Force checking verification status for:', email);
    
    // First try to refresh the auth session to ensure latest data
    try {
      await supabase.auth.refreshSession();
    } catch (refreshError) {
      console.log('⚠️ Session refresh failed, continuing with direct check:', refreshError);
    }

    // Wait a moment for database sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Now check our database
    return await this.checkVerificationStatus(email);
  }

  /**
   * Write user to database during signup
   * This ensures every new user (even unverified) is tracked in your table
   */
  static async createUserRecord(
    userId: string, 
    email: string, 
    tier: string = 'free'
  ): Promise<boolean> {
    try {
      console.log('📝 Creating user record in database:', { userId, email, tier });
      
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          tier: tier,
          email_confirmed: false,
          email_confirmed_at: null
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create user record:', error);
        return false;
      }

      console.log('✅ User record created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating user record:', error);
      return false;
    }
  }
} 