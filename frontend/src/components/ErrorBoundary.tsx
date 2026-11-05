import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Frontend rendering error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="state state-error" role="alert">
          <strong>Something went wrong</strong>
          <span>{this.state.error.message}</span>
          <button
            className="control-button"
            onClick={() => window.location.reload()}
          >
            Reload dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
