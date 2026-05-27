import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface AdminErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function AdminErrorState({
  title = 'Não foi possível carregar os dados',
  message,
  onRetry,
}: AdminErrorStateProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 md:p-10 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-white border border-red-100 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-lg font-serif font-semibold text-red-700">{title}</h3>
      <p className="mt-2 text-sm text-red-700/90 max-w-lg mx-auto leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
