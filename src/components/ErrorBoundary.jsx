import { Component } from 'react';
import { reportError } from '../lib/errorReporter.js';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
    reportError(error, { componentStack: info.componentStack, source: 'react_boundary' });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding:'40px 24px', maxWidth:520, margin:'60px auto',
          background:'#161C23', border:'1px solid #4A1F23', borderRadius:14,
          color:'#E5EAF0', textAlign:'center'
        }}>
          <div style={{fontSize:42, marginBottom:14}}>💥</div>
          <h2 style={{fontSize:20, marginBottom:8, fontWeight:700}}>Algo se rompió</h2>
          <p style={{fontSize:13, color:'#9DA8B5', marginBottom:20, lineHeight:1.5}}>
            Hay un error inesperado. Refresca la página. Si vuelve a pasar, manda screenshot.
          </p>
          <pre style={{
            background:'#0E1217', padding:12, borderRadius:8, fontSize:11,
            color:'#D4787A', overflow:'auto', textAlign:'left', maxHeight:200
          }}>{String(this.state.error?.message || this.state.error)}</pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop:20, padding:'10px 20px', background:'#E07856',
              color:'white', border:'none', borderRadius:8, fontSize:14,
              fontWeight:600, cursor:'pointer'
            }}
          >
            Refrescar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
