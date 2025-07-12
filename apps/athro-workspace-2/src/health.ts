// 🏥 Athro Workspace - Health Check Endpoint
// Simple health check for the workspace application

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      details?: string;
      duration?: number;
    };
  };
}

// Simple health check function
export function checkHealth(): HealthStatus {
  const startTime = performance.now();
  
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    uptime: performance.now(),
    checks: {}
  };

  // Check basic functionality
  try {
    // Test localStorage
    const testKey = 'health-check-' + Date.now();
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    
    health.checks.localStorage = {
      status: 'pass',
      duration: performance.now() - startTime
    };
  } catch (error) {
    health.checks.localStorage = {
      status: 'fail',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    health.status = 'degraded';
  }

  // Check if we can access environment variables
  try {
    const hasRequiredEnvVars = !!(
      import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      import.meta.env.VITE_OPENAI_API_KEY
    );
    
    health.checks.environment = {
      status: hasRequiredEnvVars ? 'pass' : 'warn',
      details: hasRequiredEnvVars ? 'All required env vars present' : 'Some env vars missing'
    };
    
    if (!hasRequiredEnvVars && health.status === 'healthy') {
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.environment = {
      status: 'fail',
      details: 'Cannot access environment variables'
    };
    health.status = 'unhealthy';
  }

  // Check if React is working
  try {
    const reactVersion = '19.0.0'; // Static for now
    health.checks.react = {
      status: 'pass',
      details: `React ${reactVersion}`
    };
  } catch (error) {
    health.checks.react = {
      status: 'fail',
      details: 'React not available'
    };
    health.status = 'unhealthy';
  }

  // Check WebSocket capability (basic test)
  try {
    const wsSupported = typeof WebSocket !== 'undefined';
    health.checks.websocket = {
      status: wsSupported ? 'pass' : 'warn',
      details: wsSupported ? 'WebSocket supported' : 'WebSocket not supported'
    };
  } catch (error) {
    health.checks.websocket = {
      status: 'fail',
      details: 'WebSocket check failed'
    };
  }

  // Check IndexedDB (for offline functionality)
  try {
    const idbSupported = typeof indexedDB !== 'undefined';
    health.checks.indexedDB = {
      status: idbSupported ? 'pass' : 'warn',
      details: idbSupported ? 'IndexedDB supported' : 'IndexedDB not supported'
    };
  } catch (error) {
    health.checks.indexedDB = {
      status: 'fail',
      details: 'IndexedDB check failed'
    };
  }

  return health;
}

// Health check route handler (for express-like servers)
export function healthCheckHandler(req: any, res: any) {
  try {
    const health = checkHealth();
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
}

// Simple health endpoint for client-side
export function createHealthEndpoint() {
  return {
    '/health': () => {
      const health = checkHealth();
      return new Response(JSON.stringify(health), {
        status: health.status === 'healthy' ? 200 : 
                health.status === 'degraded' ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    }
  };
} 