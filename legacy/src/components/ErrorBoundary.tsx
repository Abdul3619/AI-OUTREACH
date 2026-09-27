import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an uncaught rendering error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-xl shadow-red-950/10">
            <div className="inline-flex items-center justify-center p-4 bg-red-950/40 text-red-400 rounded-full mb-6">
              <AlertOctagon className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-400 mb-6">
              An unexpected error occurred in the visual application loop. Our telemetry is tracking this fault.
            </p>
            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-left font-mono text-xs text-red-300 overflow-auto max-h-36 mb-6">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-red-600/10"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
