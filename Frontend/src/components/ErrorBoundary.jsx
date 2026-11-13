import { Component } from 'react';

/** Last-resort error screen. Shows a generic message; details go to the console only. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ maxWidth: 520, margin: '15vh auto', padding: 24, fontFamily: 'var(--font-body)' }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: 'var(--ink-muted)', marginBottom: 20 }}>Please reload the page. If it keeps happening, try again in a few minutes.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ padding: '10px 16px', borderRadius: 10, border: 0, background: 'var(--accent)', color: 'var(--accent-ink)', fontWeight: 600 }}
        >
          Reload
        </button>
      </div>
    );
  }
}
