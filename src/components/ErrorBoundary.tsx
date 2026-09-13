import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 text-center px-6">
        <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={48} className="text-red-500" />
        </div>
        <div className="space-y-3 max-w-md">
          <h2 className="text-2xl font-bold font-cairo text-islamic-green dark:text-islamic-gold">
            حدث خطأ غير متوقع
          </h2>
          <p className="opacity-50 text-sm font-mono bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl">
            {this.state.message || 'Unknown error'}
          </p>
        </div>
        <button
          onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload(); }}
          className="flex items-center gap-3 px-8 py-4 bg-islamic-gold text-islamic-green rounded-full font-bold shadow-xl hover:scale-105 transition-all"
        >
          <RefreshCw size={20} />
          إعادة تحميل الصفحة
        </button>
      </div>
    );
  }
}
