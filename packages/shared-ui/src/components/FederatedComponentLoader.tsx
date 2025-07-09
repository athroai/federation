import React, { lazy, Suspense, ComponentType, useState, useEffect } from 'react';

interface FederatedComponentLoaderProps {
  scope: string;          // Remote app name (e.g., 'athro_workspace')
  module: string;         // Module path (e.g., './DocumentViewer')
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  props?: Record<string, any>;
}

/**
 * FederatedComponentLoader provides a consistent way to load federated components
 * This implements the "UI remains coherent regardless of source" principle by providing
 * standardized loading states and error handling
 */
export const FederatedComponentLoader: React.FC<FederatedComponentLoaderProps> = ({
  scope,
  module,
  fallback = <div className="athro-federated-loading">Loading...</div>,
  errorFallback = <div className="athro-federated-error">Failed to load component</div>,
  props = {}
}) => {
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when scope or module changes
    setComponent(null);
    setError(null);
    
    const loadComponent = async () => {
      try {
        // Dynamically import the federated component
        const factory = await (window as any)[scope].get(module);
        const RemoteComponent = factory();
        setComponent(() => RemoteComponent);
      } catch (err) {
        console.error(`Error loading federated component ${scope}/${module}:`, err);
        setError(err as Error);
      }
    };
    
    loadComponent();
  }, [scope, module]);
  
  if (error) {
    return <>{errorFallback}</>;
  }
  
  if (!Component) {
    return <>{fallback}</>;
  }
  
  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

/**
 * Higher-order function to create a component that wraps FederatedComponentLoader
 * Makes it easier to use federated components with custom loading states
 */
export function createFederatedComponent<T = any>(
  scope: string,
  module: string,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode
) {
  return (props: T) => (
    <FederatedComponentLoader
      scope={scope}
      module={module}
      fallback={fallback}
      errorFallback={errorFallback}
      props={props as any}
    />
  );
}
