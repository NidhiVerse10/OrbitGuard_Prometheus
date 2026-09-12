import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('OrbitGuard ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded border border-red-500/40 bg-red-950/20 text-red-300 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-red-400">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{this.props.fallbackTitle || 'CONSOLE PANEL DIAGNOSTIC NOTICE'}</span>
          </div>
          <p className="text-[11px] text-slate-300">
            {this.state.error?.message || 'Component failed to render.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] uppercase font-bold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RETRY COMPONENT</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
