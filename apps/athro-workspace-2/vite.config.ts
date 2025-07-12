import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

/**
 * Workspace Remote Application (athro-workspace-2) Configuration
 * 
 * This application:
 * - Exposes workspace-specific components to the host
 * - Owns the workspace domain including document handling
 * - Emits events when workspace state changes (e.g., confidence levels)
 * 
 * Following the "Each service owns and protects its domain" principle,
 * the workspace app is the sole owner of workspace-related functionality.
 */
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  // Production URLs - UPDATE THESE WITH YOUR ACTUAL DOMAINS
  const WORKSPACE_PROD_URL = 'https://athro-workspace.vercel.app';
  
  const baseUrl = isProduction ? '/' : '/';

  return {
    plugins: [
      react(),
      federation({
        name: 'workspace',
        filename: 'remoteEntry.js',
        // Components this remote exposes to the host
        exposes: {
          './WorkspaceService': './src/services/WorkspaceService.ts',
          './ConfidenceMeter': './src/components/ConfidenceMeter.tsx'
        },
        // Shared dependencies to avoid duplication
        shared: ['react', 'react-dom', '@athro/shared-services', '@athro/shared-ui']
      })
    ],
    resolve: {
      alias: isProduction ? {
        // Use relative imports in production
        '@athro/shared-services': path.resolve(__dirname, '../../packages/shared-services/src'),
        '@athro/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src')
      } : {
        // Use absolute paths in development  
        '@athro/shared-services': path.resolve(__dirname, '../../packages/shared-services/src'),
        '@athro/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src')
      }
    },
    server: {
      port: 5175,
      strictPort: true,
      cors: true,
      origin: 'http://localhost:5175',
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
      rollupOptions: {
        external: isProduction ? [] : undefined,
        output: {
          // Ensure consistent chunk naming for federation
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    },
    base: baseUrl,
    define: {
      // Pass environment info to the app
      __PROD_WORKSPACE_URL__: JSON.stringify(isProduction ? WORKSPACE_PROD_URL : 'http://localhost:5175')
    }
  };
});

