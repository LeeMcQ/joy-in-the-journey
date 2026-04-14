import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[100dvh] flex-col items-center justify-center gap-5 px-8 text-center bg-base">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/10">
            <RefreshCw size={28} className="text-gold-500" />
          </div>
          <h2 className="font-display text-xl font-bold">Something went wrong</h2>
          <p className="text-muted text-sm max-w-[280px] leading-relaxed">
            An unexpected error occurred. Tap below to reload.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            <RefreshCw size={16} /> Reload App
          </button>
          {this.state.error && (
            <p className="text-muted text-[10px] font-mono max-w-[300px] break-all opacity-40">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
