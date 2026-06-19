'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`,
      error,
      errorInfo.componentStack
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-destructive/5 p-6 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {this.props.label || '预览'}渲染异常
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {this.state.error?.message || '发生了未知错误'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
