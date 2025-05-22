import React, { Component, ErrorInfo, ReactNode } from 'react';
import { eventBus } from '@athro/shared-services';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  appName: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary provides consistent error handling across all Athro applications
 * Implements the "Everything is observable" principle by reporting errors to the event bus
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Report error to event bus for observability
    eventBus.publish('error.ui.caught', {
      source: this.props.appName,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (typeof fallback === 'function' && error) {
        return fallback(error, this.resetErrorBoundary);
      }
      
      if (fallback) {
        return fallback;
      }
      
      // Default error UI
      return (
        <div className="athro-error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error Details</summary>
            <pre>{error?.toString()}</pre>
          </details>
          <button onClick={this.resetErrorBoundary}>
            Try Again
          </button>
        </div>
      );
    }

    return children;
  }
}
