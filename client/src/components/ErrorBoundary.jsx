import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1 className="error-boundary-title">Something went wrong</h1>
          <p className="error-boundary-message">
            An unexpected error occurred. Please refresh the page to try again.
          </p>
          <button
            type="button"
            className="error-boundary-retry"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
