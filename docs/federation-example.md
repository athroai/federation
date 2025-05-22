# Module Federation Implementation Guide

This guide shows how to implement Vite Module Federation to enable your applications to communicate while maintaining their domain boundaries.

## App Configuration Example

For each app in your monorepo, you'll need to update the `vite.config.ts` file to include federation. Here's an example:

```typescript
// vite.config.ts for athro-dashboard
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import { createFederationConfig } from '@athro/shared-services';

// Configure federation based on app role
const federationConfig = createFederationConfig({
  name: 'athro_dashboard',
  port: 5201,
  // Components this app exposes to others
  exposes: {
    './DashboardWidgets': './src/components/DashboardWidgets.tsx',
    './AnalyticsService': './src/services/AnalyticsService.ts'
  },
  // Remote apps this app consumes
  remotes: [
    'athro_workspace@5202',
    'athro_metrics@5203',
    'lovable_athro_ai@5200'
  ],
  // Additional shared dependencies
  shared: ['@athro/shared-ui', '@athro/shared-types']
});

export default defineConfig({
  plugins: [
    react(),
    federation(federationConfig)
  ],
  server: {
    port: 5201,
    strictPort: true,
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  }
});
```

## Event Communication

Using the event bus from shared-services, applications can communicate without direct dependencies:

```typescript
// In a component or service
import { eventBus } from '@athro/shared-services';
import { FederationEvent, NavigationPayload } from '@athro/shared-types';

// Subscribe to events from other apps
const unsubscribe = eventBus.subscribe('workspace.document.opened', (payload) => {
  console.log('Document opened in workspace:', payload);
  // Update local state based on the event
});

// Publish events to other apps
function openDashboard(dashboardId: string) {
  eventBus.publish('dashboard.open.requested', {
    dashboardId,
    timestamp: new Date().toISOString()
  });
}

// Clean up when component unmounts
useEffect(() => {
  return () => unsubscribe();
}, []);
```

## Consuming Remote Components

You can import and use components from other applications:

```tsx
import React, { lazy, Suspense } from 'react';

// Lazy-load a component from another app
const WorkspaceDocumentViewer = lazy(() => import('athro_workspace/DocumentViewer'));

function DashboardPage() {
  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      
      {/* Use a remote component with fallback */}
      <Suspense fallback={<div>Loading Document Viewer...</div>}>
        <WorkspaceDocumentViewer 
          documentId="123"
          onSave={(doc) => {
            // Handle events from the remote component
            console.log('Document saved:', doc);
          }} 
        />
      </Suspense>
    </div>
  );
}
```

## Data Synchronization

Following the "shared state is synchronized, not copied" principle:

```typescript
import { eventBus } from '@athro/shared-services';
import { SyncPayload } from '@athro/shared-types';

// When data changes in this app
function updateUserPreferences(preferences) {
  // First, update local state
  localUserPreferences = preferences;
  
  // Then, broadcast the change with version
  eventBus.publish('user.preferences.updated', {
    data: preferences,
    version: currentVersion + 1,
    lastModified: new Date().toISOString()
  } as SyncPayload<typeof preferences>);
}

// Listen for changes from other apps
eventBus.subscribe('user.preferences.updated', (payload: SyncPayload<any>) => {
  // Only update if the incoming version is newer
  if (payload.version > currentVersion) {
    localUserPreferences = payload.data;
    currentVersion = payload.version;
  }
});
```
