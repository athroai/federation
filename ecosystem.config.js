// 🚀 Athro Federation - PM2 Production Configuration
// This file configures PM2 process management for production deployment

module.exports = {
  apps: [
    {
      name: 'athro-workspace',
      script: 'npm',
      args: 'run start:workspace',
      cwd: '/opt/athro-federation',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5200,
        VITE_APP_ENV: 'production'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5200,
        VITE_APP_ENV: 'staging'
      },
      error_file: './logs/workspace-err.log',
      out_file: './logs/workspace-out.log',
      log_file: './logs/workspace.log',
      log_type: 'json',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      restart_delay: 1000,
      max_restarts: 5,
      min_uptime: '10s'
    },
    {
      name: 'athro-dashboard',
      script: 'npm',
      args: 'run start:dashboard',
      cwd: '/opt/athro-federation',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 5211,
        VITE_APP_ENV: 'production'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5211,
        VITE_APP_ENV: 'staging'
      },
      error_file: './logs/dashboard-err.log',
      out_file: './logs/dashboard-out.log',
      log_file: './logs/dashboard.log',
      log_type: 'json',
      max_memory_restart: '500M',
      node_args: '--max-old-space-size=512',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      restart_delay: 1000,
      max_restarts: 5,
      min_uptime: '10s'
    },
    {
      name: 'athro-webhooks',
      script: 'npm',
      args: 'start',
      cwd: '/opt/athro-federation/webhook-server',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001
      },
      error_file: './logs/webhooks-err.log',
      out_file: './logs/webhooks-out.log',
      log_file: './logs/webhooks.log',
      log_type: 'json',
      max_memory_restart: '200M',
      kill_timeout: 3000,
      wait_ready: true,
      listen_timeout: 5000,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '5s'
    },
    {
      name: 'athro-health-monitor',
      script: './scripts/health-monitor.js',
      cwd: '/opt/athro-federation',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        HEALTH_CHECK_INTERVAL: 30000
      },
      error_file: './logs/health-monitor-err.log',
      out_file: './logs/health-monitor-out.log',
      log_file: './logs/health-monitor.log',
      max_memory_restart: '100M',
      restart_delay: 5000,
      max_restarts: 3,
      min_uptime: '30s'
    }
  ],

  deploy: {
    production: {
      user: 'athro',
      host: ['athro-prod-01.example.com', 'athro-prod-02.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/athro-federation.git',
      path: '/opt/athro-federation',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'post-setup': 'ls -la'
    },
    staging: {
      user: 'athro',
      host: 'athro-staging.example.com',
      ref: 'origin/staging',
      repo: 'git@github.com:your-org/athro-federation.git',
      path: '/opt/athro-federation-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
}; 