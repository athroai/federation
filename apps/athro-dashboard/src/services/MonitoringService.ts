import { supabase } from './supabaseClient';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  timestamp: string;
  error?: string;
}

export interface SystemMetrics {
  userCount: number;
  activeUsers: number;
  subscriptionRate: number;
  errorRate: number;
  averageResponseTime: number;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private healthChecks: Map<string, HealthCheckResult> = new Map();

  private constructor() {}

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async performHealthCheck(): Promise<HealthCheckResult[]> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkAuthentication(),
      this.checkStorage(),
      this.checkPayments()
    ]);

    const results: HealthCheckResult[] = checks.map((check, index) => {
      const services = ['database', 'authentication', 'storage', 'payments'];
      if (check.status === 'fulfilled') {
        return check.value;
      } else {
        return {
          service: services[index],
          status: 'unhealthy',
          responseTime: 0,
          timestamp: new Date().toISOString(),
          error: check.reason?.message || 'Unknown error'
        };
      }
    });

    // Store results
    results.forEach(result => {
      this.healthChecks.set(result.service, result);
    });

    return results;
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - start;
      
      return {
        service: 'database',
        status: error ? 'unhealthy' : 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error: error?.message
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Database check failed'
      };
    }
  }

  private async checkAuthentication(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const { data, error } = await supabase.auth.getSession();
      const responseTime = Date.now() - start;
      
      return {
        service: 'authentication',
        status: error ? 'unhealthy' : 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error: error?.message
      };
    } catch (error) {
      return {
        service: 'authentication',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Auth check failed'
      };
    }
  }

  private async checkStorage(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .list('', { limit: 1 });

      const responseTime = Date.now() - start;
      
      return {
        service: 'storage',
        status: error ? 'degraded' : 'healthy', // Storage issues are less critical
        responseTime,
        timestamp: new Date().toISOString(),
        error: error?.message
      };
    } catch (error) {
      return {
        service: 'storage',
        status: 'degraded',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Storage check failed'
      };
    }
  }

  private async checkPayments(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Simple check to see if Stripe is configured
      const hasStripeKey = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      const responseTime = Date.now() - start;
      
      return {
        service: 'payments',
        status: hasStripeKey ? 'healthy' : 'degraded',
        responseTime,
        timestamp: new Date().toISOString(),
        error: hasStripeKey ? undefined : 'Stripe not configured'
      };
    } catch (error) {
      return {
        service: 'payments',
        status: 'degraded',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Payment check failed'
      };
    }
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const [userCountResult, activeUsersResult, subscriptionResult] = await Promise.allSettled([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).gte('last_sign_in_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('profiles').select('user_tier', { count: 'exact' }).eq('user_tier', 'full')
      ]);

      const userCount = userCountResult.status === 'fulfilled' ? userCountResult.value.count || 0 : 0;
      const activeUsers = activeUsersResult.status === 'fulfilled' ? activeUsersResult.value.count || 0 : 0;
      const fullUsers = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value.count || 0 : 0;

      const subscriptionRate = userCount > 0 ? (fullUsers / userCount) * 100 : 0;

      // Calculate average response time from health checks
      const healthCheckResults = Array.from(this.healthChecks.values());
      const averageResponseTime = healthCheckResults.length > 0 
        ? healthCheckResults.reduce((sum, check) => sum + check.responseTime, 0) / healthCheckResults.length
        : 0;

      // Calculate error rate (percentage of unhealthy services)
      const unhealthyCount = healthCheckResults.filter(check => check.status === 'unhealthy').length;
      const errorRate = healthCheckResults.length > 0 
        ? (unhealthyCount / healthCheckResults.length) * 100
        : 0;

      return {
        userCount,
        activeUsers,
        subscriptionRate,
        errorRate,
        averageResponseTime
      };
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error getting system metrics:', error);
      return {
        userCount: 0,
        activeUsers: 0,
        subscriptionRate: 0,
        errorRate: 100,
        averageResponseTime: 0
      };
    }
  }

  async logError(error: Error, context?: Record<string, any>): Promise<void> {
    try {
      // Log to Supabase for internal tracking
      await supabase.from('error_logs').insert({
        message: error.message,
        stack: error.stack,
        context: context || {},
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href
      });

      // Also log to Sentry if configured
      if (import.meta.env.VITE_SENTRY_DSN && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            additional: context
          }
        });
      }
    } catch (logError) {
      // Fallback to console if logging fails
      if (import.meta.env.DEV) {
        console.error('Failed to log error:', logError);
        console.error('Original error:', error);
      }
    }
  }

  async logEvent(event: string, data?: Record<string, any>): Promise<void> {
    try {
      // Log analytics events
      await supabase.from('analytics_events').insert({
        event_name: event,
        event_data: data || {},
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href
      });

      // Also send to Google Analytics if configured
      if (import.meta.env.VITE_GA_TRACKING_ID && (window as any).gtag) {
        (window as any).gtag('event', event, data);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to log event:', error);
    }
  }

  getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const results = Array.from(this.healthChecks.values());
    if (results.length === 0) return 'unhealthy';

    const hasUnhealthy = results.some(r => r.status === 'unhealthy');
    const hasDegraded = results.some(r => r.status === 'degraded');

    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }
}

export const monitoringService = MonitoringService.getInstance();

// Set up global error handling
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    monitoringService.logError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    monitoringService.logError(new Error(event.reason), {
      type: 'unhandled_promise_rejection'
    });
  });
} 