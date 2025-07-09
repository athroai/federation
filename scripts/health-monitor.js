#!/usr/bin/env node

// 🏥 Athro Federation - Health Monitor Service
// Comprehensive health checking for all services

const express = require('express');
const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;
const HEALTH_CHECK_INTERVAL = process.env.HEALTH_CHECK_INTERVAL || 30000;

// Service configuration
const services = {
  workspace: {
    name: 'Athro Workspace',
    url: 'http://localhost:5200/health',
    timeout: 5000,
    critical: true
  },
  dashboard: {
    name: 'Athro Dashboard', 
    url: 'http://localhost:5211/health',
    timeout: 5000,
    critical: true
  },
  webhooks: {
    name: 'Webhook Server',
    url: 'http://localhost:3001/health',
    timeout: 3000,
    critical: true
  }
};

// Health status storage
let healthStatus = {
  overall: 'unknown',
  services: {},
  lastCheck: null,
  uptime: process.uptime(),
  version: process.env.npm_package_version || '1.0.0'
};

// Utility function to make HTTP requests
function makeRequest(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });

    request.on('error', reject);
  });
}

// Check individual service health
async function checkService(serviceKey, service) {
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(service.url, service.timeout);
    const responseTime = Date.now() - startTime;
    
    const isHealthy = response.statusCode >= 200 && response.statusCode < 300;
    
    return {
      name: service.name,
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime,
      statusCode: response.statusCode,
      lastCheck: new Date().toISOString(),
      critical: service.critical,
      details: isHealthy ? null : `HTTP ${response.statusCode}`
    };
  } catch (error) {
    return {
      name: service.name,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      statusCode: null,
      lastCheck: new Date().toISOString(),
      critical: service.critical,
      details: error.message
    };
  }
}

// Check system resources
async function checkSystemResources() {
  try {
    const [memInfo, diskInfo, loadAvg] = await Promise.all([
      getMemoryInfo(),
      getDiskInfo(),
      getLoadAverage()
    ]);

    return {
      memory: memInfo,
      disk: diskInfo,
      load: loadAvg,
      uptime: process.uptime()
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

// Get memory information
function getMemoryInfo() {
  return new Promise((resolve, reject) => {
    exec('free -m', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      const lines = stdout.split('\n');
      const memLine = lines[1].split(/\s+/);
      
      resolve({
        total: parseInt(memLine[1]),
        used: parseInt(memLine[2]),
        free: parseInt(memLine[3]),
        available: parseInt(memLine[6]),
        usagePercent: Math.round((parseInt(memLine[2]) / parseInt(memLine[1])) * 100)
      });
    });
  });
}

// Get disk information
function getDiskInfo() {
  return new Promise((resolve, reject) => {
    exec('df -h /', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      const lines = stdout.split('\n');
      const diskLine = lines[1].split(/\s+/);
      
      resolve({
        total: diskLine[1],
        used: diskLine[2],
        available: diskLine[3],
        usagePercent: diskLine[4]
      });
    });
  });
}

// Get load average
function getLoadAverage() {
  return new Promise((resolve) => {
    const loads = require('os').loadavg();
    resolve({
      '1min': loads[0].toFixed(2),
      '5min': loads[1].toFixed(2),
      '15min': loads[2].toFixed(2)
    });
  });
}

// Check database connectivity
async function checkDatabase() {
  try {
    // This would be replaced with actual database health check
    // For now, just return a placeholder
    return {
      status: 'healthy',
      responseTime: 50,
      connections: 5
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

// Perform comprehensive health check
async function performHealthCheck() {
  console.log('🏥 Starting health check...');
  
  const startTime = Date.now();
  
  try {
    // Check all services
    const serviceChecks = await Promise.all(
      Object.entries(services).map(([key, service]) => 
        checkService(key, service).then(result => [key, result])
      )
    );
    
    // Update service statuses
    healthStatus.services = Object.fromEntries(serviceChecks);
    
    // Check system resources
    healthStatus.system = await checkSystemResources();
    
    // Check database
    healthStatus.database = await checkDatabase();
    
    // Determine overall health
    const criticalServices = serviceChecks.filter(([key, result]) => 
      result.critical && result.status !== 'healthy'
    );
    
    healthStatus.overall = criticalServices.length > 0 ? 'unhealthy' : 'healthy';
    healthStatus.lastCheck = new Date().toISOString();
    healthStatus.uptime = process.uptime();
    healthStatus.checkDuration = Date.now() - startTime;
    
    console.log(`✅ Health check completed in ${healthStatus.checkDuration}ms - Overall: ${healthStatus.overall}`);
    
    // Log unhealthy services
    if (criticalServices.length > 0) {
      console.error('🚨 Critical services unhealthy:', criticalServices.map(([key, result]) => 
        `${result.name}: ${result.details || result.status}`
      ).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    healthStatus.overall = 'error';
    healthStatus.error = error.message;
    healthStatus.lastCheck = new Date().toISOString();
  }
}

// API Routes
app.use(express.json());

// Basic health endpoint
app.get('/health', (req, res) => {
  const isHealthy = healthStatus.overall === 'healthy';
  res.status(isHealthy ? 200 : 503).json({
    status: healthStatus.overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health endpoint
app.get('/health/detailed', (req, res) => {
  const isHealthy = healthStatus.overall === 'healthy';
  res.status(isHealthy ? 200 : 503).json(healthStatus);
});

// Service-specific health endpoint
app.get('/health/service/:serviceName', (req, res) => {
  const serviceName = req.params.serviceName;
  const serviceHealth = healthStatus.services[serviceName];
  
  if (!serviceHealth) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  const isHealthy = serviceHealth.status === 'healthy';
  res.status(isHealthy ? 200 : 503).json(serviceHealth);
});

// System metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    system: healthStatus.system,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: healthStatus.version,
    timestamp: new Date().toISOString()
  });
});

// Ready endpoint (for load balancer)
app.get('/ready', (req, res) => {
  const isReady = healthStatus.overall === 'healthy' && 
                  process.uptime() > 10; // Give 10 seconds warm-up time
  
  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🏥 Health Monitor Service running on port ${PORT}`);
  
  // Perform initial health check
  performHealthCheck();
  
  // Schedule periodic health checks
  setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Health monitor shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Health monitor shutting down gracefully...');
  process.exit(0);
}); 