import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-lg w-full bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-100 shadow-sm relative">
                <AlertTriangle className="w-10 h-10 relative z-10" />
                <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Something went wrong</h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                The application encountered an unexpected error. This usually happens when data from the server is mismatched or corrupted.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold">Error Trace</p>
                <p className="text-sm font-bold text-red-600 break-words leading-relaxed">
                   {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={this.handleReset}
                className="flex-1 bg-brand text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Retry
              </button>
              <button 
                onClick={this.handleGoHome}
                className="flex-1 bg-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Return Dashboard
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] pt-4">
                Satyam Xaviers EBS &bull; Advanced Error Shield
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
