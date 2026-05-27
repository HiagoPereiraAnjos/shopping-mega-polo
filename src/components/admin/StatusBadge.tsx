import React from 'react';

export type StatusBadgeTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'published'
  | 'draft'
  | 'active'
  | 'inactive'
  | 'pending';

interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
}

const toneStyles: Record<StatusBadgeTone, string> = {
  neutral: 'bg-brand-paper text-brand-dark/80 border-brand-dark/10',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft: 'bg-zinc-100 text-zinc-700 border-zinc-300',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-zinc-100 text-zinc-700 border-zinc-300',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        toneStyles[tone]
      }`}
    >
      {label}
    </span>
  );
}
