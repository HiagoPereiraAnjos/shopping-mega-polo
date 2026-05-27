import React from 'react';

interface AdminSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function AdminSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: AdminSectionProps) {
  return (
    <section className={`rounded-2xl border border-brand-dark/10 bg-white p-5 md:p-6 shadow-soft ${className ?? ''}`}>
      {(title || description || actions) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {title && <h2 className="text-xl font-serif font-semibold">{title}</h2>}
            {description && <p className="text-sm text-brand-dark/70 leading-relaxed">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}

      <div className={contentClassName ?? ''}>{children}</div>
    </section>
  );
}
