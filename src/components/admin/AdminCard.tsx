import React from 'react';

interface AdminCardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function AdminCard({
  title,
  description,
  actions,
  children,
  className,
}: AdminCardProps) {
  return (
    <section
      className={`bg-white border border-brand-dark/10 rounded-2xl shadow-soft p-5 md:p-6 ${
        className ?? ''
      }`}
    >
      {(title || description || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div className="space-y-1">
            {title && <h2 className="text-xl font-serif font-semibold">{title}</h2>}
            {description && <p className="text-sm text-brand-dark/70 leading-relaxed">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
