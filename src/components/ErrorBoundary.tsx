import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare public state: ErrorBoundaryState;
  declare public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      const { fallback } = this.props;
      const { error } = this.state;
      
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-void text-silver p-8">
          <div className="max-w-md w-full glass p-8 rounded-xl space-y-4">
            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            <p className="text-white/60">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                // Reset error state before reloading
                this.state = { hasError: false, error: null };
                window.location.reload();
              }}
              className="px-6 py-3 bg-accent-cyan/20 hover:bg-accent-cyan/30 border border-accent-cyan/50 rounded-lg text-white transition-colors"
              aria-label="Reload the application"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
