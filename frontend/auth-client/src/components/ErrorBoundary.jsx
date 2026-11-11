import React from "react";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps() {
    return { error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
          <div className="mb-4 text-[36px]">⚠️</div>
          <h2 className={`${SERIF} mb-2 text-[24px] font-bold text-[#ededf2]`}>
            Something went wrong
          </h2>
          <p className="mb-6 text-[#9a9aae]">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.reset}
            className="rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
