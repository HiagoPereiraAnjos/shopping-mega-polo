import React from 'react';
import { Loader2 } from 'lucide-react';

interface AdminLoadingStateProps {
  label?: string;
}

export default function AdminLoadingState({
  label = 'Carregando dados do CMS...',
}: AdminLoadingStateProps) {
  return (
    <div className="rounded-2xl border border-brand-dark/10 bg-white p-8 md:p-10 flex items-center justify-center gap-3 text-brand-dark/70">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
