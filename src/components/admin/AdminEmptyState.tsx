import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface AdminEmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export default function AdminEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: AdminEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-dark/20 bg-brand-paper/60 p-8 md:p-10 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-white border border-brand-dark/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-brand-dark/50" />
      </div>
      <h3 className="text-lg font-serif font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-brand-dark/70 max-w-lg mx-auto leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
