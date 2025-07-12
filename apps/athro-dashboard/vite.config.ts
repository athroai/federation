import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

/**
 * Dashboard Remote Application (athro-dashboard) Configuration
 * 
 * This application:
 * - Exposes dashboard-specific components to the host
 * - Consumes confidence level updates from the workspace
 * - Owns the dashboard domain including data visualization
 * 
 * Following the "Each service owns and protects its domain" principle,
 * the dashboard app is the sole owner of dashboard-related functionality.
 */
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isStandalone = process.env.STANDALONE === 'true' || isProduction;
  
  return {
    plugins: [
      react(),
      // Remove federation plugin for standalone builds
      ...(isStandalone ? [] : [
        federation({
          name: 'dashboard',
          filename: 'remoteEntry.js',
          exposes: {
            './DashboardPanel': './src/components/DashboardPanel.tsx'
          },
          shared: ['react', 'react-dom']
        })
      ]),
      // Custom plugin to add CSP headers in development only
      ...(isProduction ? [] : [{
        name: 'dev-csp-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Disable CSP entirely for development to avoid conflicts
            res.removeHeader('Content-Security-Policy');
            res.removeHeader('Content-Security-Policy-Report-Only');
            
            // Set permissive CORS headers for development
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', '*');
            res.setHeader('Access-Control-Allow-Headers', '*');
            
            next();
          });
        }
      }])
    ],
    server: {
      port: 5210,
      strictPort: true,
      cors: true,
      origin: 'http://localhost:5210',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    },
    build: {
      modulePreload: false,
      target: 'esnext',
      minify: isProduction,
      cssCodeSplit: false,
      sourcemap: false,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    base: '/'
  };
});
