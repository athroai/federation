import React, { Suspense, ComponentType, useState, useEffect } from 'react';

interface FederatedComponentLoaderProps {
  scope: string;
  module: string;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

interface FederatedWindow extends Window {
  [key: string]: any;
}

declare let window: FederatedWindow;

/**
 * FederatedComponentLoader dynamically loads federated components
 * Implements the "Everything is observable" principle by reporting loading events
 */
export const FederatedComponentLoader: React.FC<FederatedComponentLoaderProps> = ({ 
  scope, 
  module, 
  fallback,
  onError 
}) => {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!window[scope]) {
          throw new Error(`Scope ${scope} not found on window`);
        }
        
        const factory = await window[scope].get(module);
        const Module = factory();
        setComponent(() => Module.default || Module);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setLoading(false);
      }
    };

    loadComponent();
  }, [scope, module, onError]);

  if (loading) {
    return fallback || <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading component: {error.message}</div>;
  }

  if (!Component) {
    return <div>Component not found</div>;
  }

  return (
    <Suspense fallback={fallback || <div>Loading...</div>}>
      <Component />
    </Suspense>
  );
};
